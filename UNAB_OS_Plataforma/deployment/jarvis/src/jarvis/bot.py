from __future__ import annotations

import asyncio
import json
import logging
import re
import unicodedata
from datetime import datetime, timedelta
from functools import wraps
from pathlib import Path

from openai import AuthenticationError, PermissionDeniedError
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

from .assistant import JarvisAssistant
from .coaching import build_coach_message, coach_slot
from .config import Settings
from .db import Database
from .formatting import reply_rich, send_rich, split_message
from .parsing import AcademicEventArgs, parse_academic_event, parse_add_command, parse_remind_command
from .tema_materials import CloudTemaMaterialCatalog, TemaCatalogError, TemaMaterial, TemaMaterialCatalog, normalize
from .university_os_bridge import BridgeClaim, BridgeValidationError, CloudUniversityOsBridge, ReportConflictError, UniversityOsBridge

logging.basicConfig(format="%(asctime)s %(levelname)s %(name)s: %(message)s", level=logging.INFO)
# httpx registra la URL completa de Telegram, que contiene el token del bot.
# Mantener este logger en WARNING evita exponer credenciales en terminales y logs.
logging.getLogger("httpx").setLevel(logging.WARNING)
LOGGER = logging.getLogger(__name__)

TELEGRAM_CONNECT_TIMEOUT_SECONDS = 30
TELEGRAM_READ_TIMEOUT_SECONDS = 120
TELEGRAM_WRITE_TIMEOUT_SECONDS = 120
TELEGRAM_MEDIA_WRITE_TIMEOUT_SECONDS = 120
TELEGRAM_POOL_TIMEOUT_SECONDS = 30
PENDING_MATERIAL_KEY = "pending_study_materials"
MAX_MATERIAL_CHOICES = 8
MATERIAL_CHOICE_TTL_SECONDS = 30 * 60


def configure_telegram_timeouts(builder):
    return (
        builder
        .connect_timeout(TELEGRAM_CONNECT_TIMEOUT_SECONDS)
        .read_timeout(TELEGRAM_READ_TIMEOUT_SECONDS)
        .write_timeout(TELEGRAM_WRITE_TIMEOUT_SECONDS)
        .media_write_timeout(TELEGRAM_MEDIA_WRITE_TIMEOUT_SECONDS)
        .pool_timeout(TELEGRAM_POOL_TIMEOUT_SECONDS)
    )

HELP = """## Comandos de Jarvis
`/link CÓDIGO` — enlazar este chat privado con Universidad OS
`/whoami` — mostrar tu ID numérico de Telegram
`/plan` — plan inteligente según tus pendientes
`/tasks` — listar tareas pendientes
`/add tarea | materia | fecha` — crear tarea
`/done ID` — completar tarea
`/remind fecha | mensaje` — programar recordatorio
`/today` — agenda de hoy
`/coach on|off|status` — controlar los empujones automáticos
`/estudiar [ID]` — enviar el próximo handoff verificado o reenviar uno por ID
`/reset` — borrar el historial de conversación

**Fechas:** `mañana 18:00`, `27/08 20:00` o `2026-08-27 20:00`.
También puedes escribirme normalmente."""


def requests_study_material(text: str) -> bool:
    """Detect explicit requests for a ChatGPT prompt plus an attached study file."""
    normalized = "".join(
        char for char in unicodedata.normalize("NFKD", text.casefold())
        if not unicodedata.combining(char)
    )
    mentions_chatgpt = "chatgpt" in normalized or "chat gpt" in normalized
    mentions_file = any(
        term in normalized
        for term in ("pdf", "diapositiva", "archivo", "documento", "material", "guia")
    )
    asks_for_delivery = any(
        term in normalized
        for term in (
            "envia", "mand", "adjunt", "dame", "pasa", "compart", "quiero", "necesito",
            "no me diste", "que le envio",
        )
    )
    return mentions_chatgpt and mentions_file and asks_for_delivery


def natural_study_query(text: str) -> str | None:
    normalized = normalize(text)
    patterns = (
        r"^(?:necesito|quiero|debo) estudiar(?: para| de)? (.+)$",
        r"^(?:vamos a|voy a) estudiar(?: para| de)? (.+)$",
        r"^estudiemos(?: para| de)? (.+)$",
        r"^preparame para estudiar (.+)$",
    )
    for pattern in patterns:
        if match := re.fullmatch(pattern, normalized):
            return match.group(1).strip()
    return None


def choose_pending_material(text: str, materials: list[TemaMaterial]) -> TemaMaterial | None:
    normalized = normalize(text)
    if normalized.isdigit():
        index = int(normalized) - 1
        return materials[index] if 0 <= index < len(materials) else None
    matches = [
        item for item in materials
        if normalized and normalized in normalize(f"{item.title} {item.section}")
    ]
    return matches[0] if len(matches) == 1 else None


def missing_study_material_message() -> str:
    return (
        "## Falta elegir el material verificado\n\n"
        "No voy a inventarte un PDF ni darte otro prompt genérico. Este mensaje no tiene un archivo de estudio seleccionado.\n\n"
        "1. Abrí **Universidad OS → Dashboard**.\n"
        "2. En el panel de **Jarvis**, elegí el PDF o las diapositivas que sí correspondan a la materia y al tema.\n"
        "3. Pulsá **Enviar con Jarvis**.\n\n"
        "Luego escribí `/estudiar`: verificaré el handoff y te enviaré juntos el prompt real y el documento. "
        "Si Cálculo no aparece en la biblioteca, decime el tema exacto y primero confirmamos qué archivo usar."
    )


def material_choices_message(course: str, materials: list[TemaMaterial]) -> str:
    lines = [
        f"## Encontré varios materiales de {course}",
        "",
        "Respondé solo con el número o con un nombre inequívoco:",
    ]
    for index, material in enumerate(materials, start=1):
        lines.append(f"{index}. **{material.title}** · {material.section}")
    lines.extend(("", "No enviaré ninguno hasta que elijas uno."))
    return "\n".join(lines)


def build_study_handoff_message(title: str, subject: str, topic: str) -> str:
    return (
        "## Ey: es hora de estudiar. 📚\n\n"
        "No me importa la excusa de este momento: el bloque ya está preparado y vas a empezarlo ahora.\n\n"
        f"**{title}** · {subject}\n"
        f"Tema: **{topic}**\n\n"
        "1. Descargá el archivo que te envío.\n"
        "2. Abrí ChatGPT, pegá el prompt completo y adjuntá ese archivo.\n"
        "3. Estudiá hasta terminar la actividad.\n"
        "4. Pegame aquí el JSON final que te entregue ChatGPT; Universidad OS lo recibirá como informe externo."
    )


def authorized(handler):
    @wraps(handler)
    async def wrapped(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not update.effective_user or not update.effective_chat or not update.effective_message:
            return
        telegram_user_id = update.effective_user.id
        telegram_chat_id = update.effective_chat.id
        if telegram_user_id <= 0 or telegram_chat_id != telegram_user_id:
            await update.effective_message.reply_text("Usá Jarvis desde un chat privado para proteger tu cuenta.")
            return
        if not await telegram_identity_is_active(context.application, telegram_user_id, telegram_chat_id):
            LOGGER.warning("Acceso rechazado para user_id=%s", getattr(update.effective_user, "id", None))
            await reply_rich(
                update.effective_message,
                "## Primero enlaza tu cuenta\n\nAbrí **Universidad OS → Inicio**, generá un código temporal y envíalo aquí como `/link CÓDIGO`.",
            )
            return
        return await handler(update, context)

    return wrapped


async def telegram_identity_is_active(
    application: Application,
    telegram_user_id: int,
    telegram_chat_id: int,
) -> bool:
    settings: Settings = application.bot_data["settings"]
    bridge = application.bot_data.get("university_os_bridge")
    if isinstance(bridge, CloudUniversityOsBridge):
        try:
            owner_id = await asyncio.to_thread(
                bridge.trusted_owner_id,
                telegram_user_id=telegram_user_id,
                telegram_chat_id=telegram_chat_id,
            )
            return bool(owner_id)
        except BridgeValidationError:
            return False
    return settings.allowed_user_id == telegram_user_id and telegram_chat_id == telegram_user_id


def format_tasks(tasks: list[dict]) -> str:
    if not tasks:
        return "No tienes tareas pendientes."
    lines = []
    for task in tasks:
        subject = f" · {task['subject']}" if task["subject"] else ""
        if task.get("due_at"):
            due = f" · vence {task['due_at'][:16].replace('T', ' ')}"
        elif task.get("due_date"):
            due = f" · vence el {datetime.fromisoformat(task['due_date']):%d/%m/%Y} (hora pendiente)"
        else:
            due = ""
        lines.append(f"- **#{task['id']} {task['title']}**{subject}{due}")
    return "## Pendientes\n" + "\n".join(lines)


def academic_event_confirmation(event: AcademicEventArgs, stored: dict, *, created: bool) -> str:
    state = "Guardé" if created else "Actualicé"
    lines = [f"## {state} el plan de {event.subject} ✅", ""]
    if event.scope_until:
        boundary = "sin incluirlo" if event.includes_boundary is False else "incluyéndolo"
        lines.append(f"- **Alcance:** estudiar hasta **{event.scope_until}**, {boundary}.")
    lines.append(
        f"- **{event.event_type}:** **{event.event_date:%d/%m/%Y}**. "
        f"La fecha sale exactamente de los {event.relative_days} días que indicaste."
    )
    conditions = []
    if event.allows_notes is False:
        conditions.append("sin apuntes")
    if event.format_note:
        conditions.append(event.format_note.casefold())
    if conditions:
        lines.append(f"- **Condiciones:** {'; '.join(conditions)}.")
    lines.extend(
        (
            f"- **Pendiente:** tarea **#{stored['task_id']}** asociada para preparar el {event.event_type.casefold()}.",
            "",
            f"No registré una hora del {event.event_type.casefold()} porque no la dijiste. "
            "Jarvis lo guardó como evento con fecha, no como explicación de teoría.",
        )
    )
    return "\n".join(lines)


async def handle_academic_event(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    *,
    now: datetime | None = None,
) -> bool:
    settings: Settings = context.application.bot_data["settings"]
    now = now or datetime.now(settings.timezone)
    event = parse_academic_event(update.message.text, now=now, timezone=settings.timezone)
    if not event:
        return False
    db: Database = context.application.bot_data["db"]
    stored, created = db.capture_academic_event(
        update.effective_user.id,
        subject=event.subject,
        event_type=event.event_type,
        event_date=event.event_date,
        scope_until=event.scope_until,
        includes_boundary=event.includes_boundary,
        allows_notes=event.allows_notes,
        format_note=event.format_note,
        source_text=update.message.text,
        now=now,
    )
    await reply_rich(update.message, academic_event_confirmation(event, stored, created=created))
    return True


@authorized
async def whoami_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Muestra al remitente su propio ID; no revela datos de otros usuarios."""
    if update.effective_user and update.message:
        await reply_rich(update.message, f"Tu ID de Telegram es: `{update.effective_user.id}`")


async def link_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_user or not update.effective_chat or not update.message:
        return
    if update.effective_chat.id != update.effective_user.id:
        await update.message.reply_text("Por seguridad, /link solo funciona en un chat privado con Jarvis.")
        return
    if len(context.args) != 1:
        await reply_rich(update.message, "Uso: `/link CÓDIGO`. El código se genera en Universidad OS → Inicio.")
        return
    bridge = context.application.bot_data["university_os_bridge"]
    if not isinstance(bridge, CloudUniversityOsBridge):
        await update.message.reply_text("Este Jarvis no tiene configurado el puente cloud de Universidad OS.")
        return
    try:
        linked = await asyncio.to_thread(
            bridge.link,
            context.args[0].strip(),
            telegram_user_id=update.effective_user.id,
            telegram_chat_id=update.effective_chat.id,
        )
    except BridgeValidationError:
        LOGGER.exception("No se pudo consultar el servicio de enlace de Universidad OS")
        await update.message.reply_text("No pude comprobar el código por un error temporal. Esperá un momento e inténtalo otra vez; no generes otro todavía.")
        return
    if not linked:
        await update.message.reply_text("Ese código es inválido, venció, ya fue usado o hay demasiados intentos. Generá uno nuevo en Inicio.")
        return
    await reply_rich(update.message, "## Cuenta enlazada ✅\n\nEste chat privado ya puede usar Jarvis y recibir únicamente tus materiales de Universidad OS.")


@authorized
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    settings: Settings = context.application.bot_data["settings"]
    await reply_rich(
        update.message,
        f"## Jarvis conectado 🧠\nProveedor conversacional configurado: **{settings.ai_provider}** · `{settings.ai_model}`.\n\n"
        + HELP
    )


@authorized
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await reply_rich(update.message, HELP)


@authorized
async def tasks_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    db: Database = context.application.bot_data["db"]
    await reply_rich(update.message, format_tasks(db.list_tasks(update.effective_user.id)))


@authorized
async def add_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    settings: Settings = context.application.bot_data["settings"]
    db: Database = context.application.bot_data["db"]
    try:
        parsed = parse_add_command(" ".join(context.args), now=datetime.now(settings.timezone), timezone=settings.timezone)
        task_id = db.add_task(update.effective_user.id, parsed.title, parsed.subject, parsed.due_at)
        await reply_rich(update.message, f"✅ Tarea **#{task_id}** creada: **{parsed.title}**")
    except ValueError as exc:
        await update.message.reply_text(str(exc))


@authorized
async def done_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    db: Database = context.application.bot_data["db"]
    try:
        task_id = int(context.args[0])
    except (IndexError, ValueError):
        await update.message.reply_text("Uso: /done ID")
        return
    done = db.complete_task(update.effective_user.id, task_id)
    await reply_rich(update.message, "✅ **Tarea completada.**" if done else "No encontré esa tarea pendiente.")


@authorized
async def remind_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    settings: Settings = context.application.bot_data["settings"]
    db: Database = context.application.bot_data["db"]
    now = datetime.now(settings.timezone)
    try:
        parsed = parse_remind_command(" ".join(context.args), now=now, timezone=settings.timezone)
        if parsed.remind_at <= now:
            raise ValueError("El recordatorio debe quedar en el futuro.")
        reminder_id = db.add_reminder(update.effective_user.id, parsed.text, parsed.remind_at, now=now)
        await reply_rich(
            update.message,
            f"⏰ Recordatorio **#{reminder_id}** programado para **{parsed.remind_at:%d/%m %H:%M}**.",
        )
    except ValueError as exc:
        await update.message.reply_text(str(exc))


@authorized
async def today_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    settings: Settings = context.application.bot_data["settings"]
    db: Database = context.application.bot_data["db"]
    today = datetime.now(settings.timezone).date().isoformat()
    tasks = [
        task for task in db.list_tasks(update.effective_user.id)
        if (task.get("due_at") and task["due_at"].startswith(today)) or task.get("due_date") == today
    ]
    await reply_rich(update.message, "## Hoy\n" + format_tasks(tasks))


@authorized
async def plan_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    db: Database = context.application.bot_data["db"]
    tasks = db.list_tasks(update.effective_user.id)
    if not tasks:
        await reply_rich(update.message, "No hay pendientes guardados. Usa `/add` para crear el primero.")
        return
    assistant: JarvisAssistant = context.application.bot_data["assistant"]
    await context.bot.send_chat_action(update.effective_chat.id, ChatAction.TYPING)
    try:
        answer = await asyncio.to_thread(
            assistant.reply,
            update.effective_user.id,
            "Genera mi plan académico desde ahora. Consulta mis tareas, prioriza vencidas y próximas, "
            "usa bloques realistas y termina con la primera acción concreta que debo hacer.",
        )
        await reply_rich(update.message, answer)
    except Exception:
        LOGGER.exception("Error generando el plan con IA")
        lines = ["Plan sugerido (modo local):"]
        for index, task in enumerate(tasks[:5], start=1):
            lines.append(f"{index}. {task['title']} — bloque de 50 min")
        lines.append("Cierra cada bloque con ejercicios resueltos o una entrega verificable.")
        await reply_rich(update.message, "\n".join(lines))


@authorized
async def reset_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    db: Database = context.application.bot_data["db"]
    count = db.reset_messages(update.effective_user.id)
    await reply_rich(
        update.message,
        f"🧹 Historial reiniciado: **{count} mensajes**. Tus tareas siguen intactas.",
    )


@authorized
async def coach_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    settings: Settings = context.application.bot_data["settings"]
    db: Database = context.application.bot_data["db"]
    action = context.args[0].lower() if context.args else "status"
    if action in {"on", "activar", "encender"}:
        db.set_preference(update.effective_user.id, "coach_enabled", "true")
        await reply_rich(
            update.message,
            f"🔥 **Coach activado.** Te escribiré a las {', '.join(f'{hour:02d}:00' for hour in settings.coach_hours)} según tus pendientes.",
        )
    elif action in {"off", "desactivar", "apagar"}:
        db.set_preference(update.effective_user.id, "coach_enabled", "false")
        await reply_rich(update.message, "🔕 **Coach desactivado.** Tus recordatorios programados siguen funcionando.")
    elif action == "status":
        enabled = db.get_preference(
            update.effective_user.id, "coach_enabled", "true" if settings.coach_enabled else "false"
        ) == "true"
        state = "activo 🔥" if enabled else "apagado 🔕"
        await reply_rich(
            update.message,
            f"El coach está **{state}**. Horarios: {', '.join(f'{hour:02d}:00' for hour in settings.coach_hours)}.",
        )
    else:
        await reply_rich(update.message, "Uso: `/coach on`, `/coach off` o `/coach status`.")


async def queue_and_deliver_material(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    material: TemaMaterial,
) -> None:
    bridge: UniversityOsBridge = context.application.bot_data["university_os_bridge"]
    catalog: TemaMaterialCatalog = context.application.bot_data["tema_catalog"]
    telegram_user_id = update.effective_user.id
    telegram_chat_id = update.effective_chat.id
    owner_id = await asyncio.to_thread(
        bridge.trusted_owner_id,
        telegram_user_id=telegram_user_id,
        telegram_chat_id=telegram_chat_id,
    )
    if not owner_id:
        await reply_rich(
            update.message,
            "No puedo asociar este envío con una única cuenta de Universidad OS. Prepará primero un envío desde el Dashboard.",
        )
        return
    try:
        source_path = (
            Path(material.file_name)
            if isinstance(catalog, CloudTemaMaterialCatalog)
            else await asyncio.to_thread(catalog.verified_path, material)
        )
        lock = context.application.bot_data.setdefault("university_os_delivery_lock", asyncio.Lock())
        async with lock:
            handoff = await asyncio.to_thread(
                bridge.queue_verified_document,
                owner_id=owner_id,
                title=f"Sesión: {material.title}",
                subject=material.course,
                topic=material.title,
                source_path=source_path,
                file_name=material.file_name,
                mime_type=material.mime_type,
                byte_count=material.bytes,
                sha256=material.sha256,
                created_at=datetime.now().astimezone(),
                candidate_id=material.candidate_id,
                telegram_user_id=telegram_user_id,
                telegram_chat_id=telegram_chat_id,
            )
            claim = bridge.exact_claim(
                handoff.id,
                telegram_user_id=telegram_user_id,
                telegram_chat_id=telegram_chat_id,
            )
            delivered = bool(claim)
            if claim:
                await _deliver_claim(context.application, claim)
    except (OSError, TemaCatalogError, BridgeValidationError):
        LOGGER.exception("No se pudo preparar un material TEMA verificado")
        await update.message.reply_text("El archivo cambió o no superó la verificación. No envié un sustituto.")
        return
    if not delivered:
        await update.message.reply_text("El handoff quedó preparado, pero no pude reclamarlo para entrega.")


async def handle_pending_material_choice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    db: Database = context.application.bot_data["db"]
    raw = db.get_preference(update.effective_user.id, PENDING_MATERIAL_KEY)
    if not raw:
        return False
    if normalize(update.message.text) in {"cancelar", "cancela", "ninguno"}:
        db.delete_preference(update.effective_user.id, PENDING_MATERIAL_KEY)
        await reply_rich(update.message, "Selección cancelada. No envié ningún archivo.")
        return True
    try:
        pending = json.loads(raw)
        candidate_ids = pending["candidateIds"]
        created_at = pending["createdAt"]
        if not isinstance(candidate_ids, list) or not 1 <= len(candidate_ids) <= MAX_MATERIAL_CHOICES:
            raise ValueError
        if not isinstance(created_at, (int, float)) or not 0 <= datetime.now().timestamp() - created_at <= MATERIAL_CHOICE_TTL_SECONDS:
            raise ValueError
        catalog: TemaMaterialCatalog = context.application.bot_data["tema_catalog"]
        available_items = (
            await asyncio.to_thread(
                catalog.load,
                telegram_user_id=update.effective_user.id,
                telegram_chat_id=update.effective_chat.id,
            )
            if isinstance(catalog, CloudTemaMaterialCatalog)
            else await asyncio.to_thread(catalog.load)
        )
        available = {item.candidate_id: item for item in available_items}
        materials = [available[candidate_id] for candidate_id in candidate_ids]
    except (KeyError, ValueError, TypeError, json.JSONDecodeError, TemaCatalogError):
        db.delete_preference(update.effective_user.id, PENDING_MATERIAL_KEY)
        await reply_rich(update.message, "La selección anterior ya no es válida. Pedime nuevamente la materia.")
        return True
    selected = choose_pending_material(update.message.text, materials)
    if not selected:
        await reply_rich(update.message, material_choices_message(pending["course"], materials))
        return True
    db.delete_preference(update.effective_user.id, PENDING_MATERIAL_KEY)
    await queue_and_deliver_material(update, context, selected)
    return True


async def handle_natural_study_request(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    query: str,
) -> None:
    catalog: TemaMaterialCatalog = context.application.bot_data["tema_catalog"]
    try:
        result = (
            await asyncio.to_thread(
                catalog.search,
                query,
                telegram_user_id=update.effective_user.id,
                telegram_chat_id=update.effective_chat.id,
            )
            if isinstance(catalog, CloudTemaMaterialCatalog)
            else await asyncio.to_thread(catalog.search, query)
        )
    except TemaCatalogError as exc:
        await reply_rich(update.message, f"No pude consultar la captura local de TEMA: {exc}")
        return
    if result.course is None:
        examples = ", ".join(result.courses[:6])
        await reply_rich(
            update.message,
            "No identifiqué una única materia. Decime el nombre más específico."
            + (f"\n\nDisponibles: {examples}." if examples else ""),
        )
        return
    materials = list(result.materials)
    if not materials:
        await reply_rich(
            update.message,
            f"Identifiqué **{result.course}**, pero no hay un PDF descargado y verificable para esa solicitud.",
        )
        return
    if len(materials) == 1:
        await queue_and_deliver_material(update, context, materials[0])
        return
    choices = materials[:MAX_MATERIAL_CHOICES]
    db: Database = context.application.bot_data["db"]
    db.set_preference(
        update.effective_user.id,
        PENDING_MATERIAL_KEY,
        json.dumps({
            "course": result.course,
            "query": query,
            "candidateIds": [item.candidate_id for item in choices],
            "createdAt": datetime.now().timestamp(),
        }, ensure_ascii=False),
    )
    await reply_rich(update.message, material_choices_message(result.course, choices))


@authorized
async def chat(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if await handle_academic_event(update, context):
        return
    if await handle_pending_material_choice(update, context):
        return
    if query := natural_study_query(update.message.text):
        await handle_natural_study_request(update, context, query)
        return
    if requests_study_material(update.message.text):
        try:
            delivered = await deliver_next_university_os_handoff(
                context.application,
                telegram_user_id=update.effective_user.id,
                telegram_chat_id=update.effective_chat.id,
            )
        except Exception:
            LOGGER.exception("Error entregando handoff solicitado por el usuario")
            await update.message.reply_text("No pude entregar el handoff verificado. No envié material alternativo.")
            return
        if not delivered:
            await reply_rich(update.message, missing_study_material_message())
        return
    assistant: JarvisAssistant = context.application.bot_data["assistant"]
    await context.bot.send_chat_action(update.effective_chat.id, ChatAction.TYPING)
    try:
        answer = await asyncio.to_thread(assistant.reply, update.effective_user.id, update.message.text)
    except (AuthenticationError, PermissionDeniedError):
        LOGGER.exception("El proveedor de IA rechazó la credencial configurada")
        await reply_rich(
            update.message,
            "## El orquestador local sigue activo\n\n"
            "El proveedor de conversación rechazó su credencial, así que no voy a fingir una respuesta. "
            "Las tareas, fechas, recordatorios y handoffs deterministas siguen funcionando.\n\n"
            "Podés usar `/add`, `/remind`, `/tasks`, `/today` o volver a enviar una instrucción con "
            "materia, alcance y fecha mientras se renueva la credencial del modelo.",
        )
        return
    except Exception:
        LOGGER.exception("Error consultando OpenAI")
        await update.message.reply_text("Tuve un problema al pensar la respuesta. Revisa la configuración e inténtalo de nuevo.")
        return
    await reply_rich(update.message, answer)


@authorized
async def study_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if len(context.args) > 1:
        await reply_rich(update.message, "Uso: `/estudiar` o `/estudiar ID_DEL_HANDOFF`.")
        return
    handoff_id = context.args[0].strip() if context.args else None
    try:
        delivered = await deliver_next_university_os_handoff(
            context.application,
            handoff_id=handoff_id,
            telegram_user_id=update.effective_user.id,
            telegram_chat_id=update.effective_chat.id,
        )
    except Exception:
        LOGGER.exception("Error entregando handoff solicitado con /estudiar")
        await update.message.reply_text("No pude entregar el handoff verificado. No envié material alternativo.")
        return
    if not delivered:
        await reply_rich(update.message, missing_study_material_message())


@authorized
async def study_report(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    bridge: UniversityOsBridge = context.application.bot_data["university_os_bridge"]
    try:
        payload = json.loads(update.message.text)
        envelope, created = bridge.save_report(
            payload,
            received_at=datetime.now().astimezone(),
            telegram_user_id=update.effective_user.id,
            telegram_chat_id=update.effective_chat.id,
        )
    except json.JSONDecodeError:
        await update.message.reply_text("Ese texto empieza como JSON, pero no es JSON válido.")
        return
    except BridgeValidationError as exc:
        await update.message.reply_text(f"No pude importar el informe: {exc}.")
        return
    except ReportConflictError as exc:
        await update.message.reply_text(f"No reemplacé el informe: {exc}.")
        return
    handoff_id = envelope["report"]["handoffId"]
    state = "guardado" if created else "ya estaba guardado con el mismo contenido"
    await reply_rich(
        update.message,
        f"✅ **Informe {state}.**\n\nUniversidad OS podrá importar el reporte del bloque `{handoff_id}`. "
        "Este informe es evidencia externa orientativa y no cambia tu dominio académico por sí solo.",
    )


async def reminder_loop(application: Application) -> None:
    settings: Settings = application.bot_data["settings"]
    db: Database = application.bot_data["db"]
    while True:
        try:
            for reminder in db.due_reminders(datetime.now(settings.timezone)):
                if not await telegram_identity_is_active(
                    application, reminder["user_id"], reminder["user_id"]
                ):
                    continue
                await send_rich(application.bot, reminder["user_id"], f"⏰ **Recordatorio**\n{reminder['text']}")
                db.mark_reminder_sent(reminder["id"])
        except asyncio.CancelledError:
            raise
        except Exception:
            LOGGER.exception("Error en el bucle de recordatorios")
        await asyncio.sleep(settings.reminder_poll_seconds)


async def coach_loop(application: Application) -> None:
    settings: Settings = application.bot_data["settings"]
    db: Database = application.bot_data["db"]
    while True:
        try:
            now = datetime.now(settings.timezone)
            slot = coach_slot(now, settings.coach_hours)
            if slot:
                for user_id in db.list_pending_task_user_ids():
                    if not await telegram_identity_is_active(application, user_id, user_id):
                        continue
                    enabled = db.get_preference(
                        user_id, "coach_enabled", "true" if settings.coach_enabled else "false"
                    ) == "true"
                    tasks = db.list_tasks(user_id) if enabled else []
                    if not tasks:
                        continue
                    task = tasks[0]
                    if db.claim_coach_nudge(user_id, task["id"], slot, now=now):
                        name = settings.coach_name if user_id == settings.allowed_user_id else "estudiante"
                        await send_rich(
                            application.bot,
                            user_id,
                            build_coach_message(task, now, name),
                        )
        except asyncio.CancelledError:
            raise
        except Exception:
            LOGGER.exception("Error en el coach proactivo")
        await asyncio.sleep(settings.coach_poll_seconds)


async def _deliver_claim(application: Application, claim: BridgeClaim) -> None:
    settings: Settings = application.bot_data["settings"]
    bridge: UniversityOsBridge = application.bot_data["university_os_bridge"]
    handoff = claim.handoff
    chat_id = claim.telegram_chat_id or settings.allowed_user_id
    if chat_id is None or (claim.telegram_user_id is not None and claim.telegram_user_id != chat_id):
        raise BridgeValidationError("El handoff no tiene un destinatario de Telegram verificable")
    # Upload the only large/non-idempotent step before emitting the text
    # sequence. If Telegram times out, the processing claim remains for a
    # retry without duplicating the call-to-action and prompt.
    with handoff.document.path.open("rb") as document:
        await application.bot.send_document(
            chat_id=chat_id,
            document=document,
            filename=handoff.document.file_name,
            caption=f"Material para {handoff.title}",
        )
    await send_rich(
        application.bot,
        chat_id,
        build_study_handoff_message(handoff.title, handoff.subject, handoff.topic),
    )
    await send_rich(application.bot, chat_id, "## Prompt para enviar a ChatGPT")
    for chunk in split_message(handoff.prompt):
        await application.bot.send_message(chat_id=chat_id, text=chunk)
    bridge.mark_delivered(claim)


async def deliver_next_university_os_handoff(
    application: Application,
    *,
    handoff_id: str | None = None,
    telegram_user_id: int | None = None,
    telegram_chat_id: int | None = None,
) -> bool:
    bridge: UniversityOsBridge = application.bot_data["university_os_bridge"]
    lock = application.bot_data.setdefault("university_os_delivery_lock", asyncio.Lock())
    async with lock:
        claim = (
            bridge.exact_claim(
                handoff_id,
                telegram_user_id=telegram_user_id,
                telegram_chat_id=telegram_chat_id,
            )
            if handoff_id
            else bridge.next_claim(
                telegram_user_id=telegram_user_id,
                telegram_chat_id=telegram_chat_id,
            )
        )
        if not claim:
            return False
        await _deliver_claim(application, claim)
        return True


async def university_os_bridge_loop(application: Application) -> None:
    settings: Settings = application.bot_data["settings"]
    while True:
        try:
            await deliver_next_university_os_handoff(application)
        except asyncio.CancelledError:
            raise
        except Exception:
            LOGGER.exception("Error entregando un handoff de Universidad OS")
        await asyncio.sleep(settings.unab_os_bridge_poll_seconds)


async def post_init(application: Application) -> None:
    application.bot_data["reminder_task"] = asyncio.create_task(reminder_loop(application))
    application.bot_data["coach_task"] = asyncio.create_task(coach_loop(application))
    application.bot_data["university_os_bridge_task"] = asyncio.create_task(university_os_bridge_loop(application))


async def post_shutdown(application: Application) -> None:
    tasks = [
        application.bot_data.get(name)
        for name in ("reminder_task", "coach_task", "university_os_bridge_task")
    ]
    tasks = [task for task in tasks if task]
    for task in tasks:
        task.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


def build_application(settings: Settings) -> Application:
    db = Database(settings.db_path)
    cloud_values = (settings.unab_os_api_url, settings.unab_os_bridge_token)
    if any(cloud_values) and not all(cloud_values):
        raise RuntimeError("UNAB_OS_API_URL y UNAB_OS_BRIDGE_TOKEN deben configurarse juntos")
    cloud_enabled = all(cloud_values)
    if not cloud_enabled and settings.allowed_user_id is None:
        raise RuntimeError("Configura el puente cloud o TELEGRAM_ALLOWED_USER_ID para el modo local legacy")
    university_os_bridge = (
        CloudUniversityOsBridge(
            settings.unab_os_api_url,
            settings.unab_os_bridge_token,
            settings.unab_os_owner_id,
            settings.unab_os_bridge_path / "cloud-cache",
        )
        if cloud_enabled
        else UniversityOsBridge(settings.unab_os_bridge_path)
    )
    tema_catalog = (
        CloudTemaMaterialCatalog(settings.unab_os_api_url, settings.unab_os_bridge_token)
        if cloud_enabled
        else TemaMaterialCatalog()
    )
    assistant = JarvisAssistant(
        db,
        settings.ai_api_key,
        settings.ai_model,
        settings.timezone,
        settings.context_path,
        base_url=settings.ai_base_url,
        provider=settings.ai_provider,
    )
    application = (
        configure_telegram_timeouts(Application.builder().token(settings.telegram_token))
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )
    application.bot_data.update(
        settings=settings,
        db=db,
        assistant=assistant,
        university_os_bridge=university_os_bridge,
        tema_catalog=tema_catalog,
    )
    application.add_handler(CommandHandler("link", link_command))
    application.add_handler(CommandHandler("whoami", whoami_command))
    for command, handler in (
        ("start", start), ("help", help_command), ("plan", plan_command), ("tasks", tasks_command),
        ("add", add_command), ("done", done_command), ("remind", remind_command), ("today", today_command),
        ("coach", coach_command), ("reset", reset_command),
        ("estudiar", study_command),
    ):
        application.add_handler(CommandHandler(command, handler))
    application.add_handler(MessageHandler(filters.TEXT & filters.Regex(r"^\s*\{"), study_report))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, chat))
    return application


def main() -> None:
    settings = Settings.from_env()
    build_application(settings).run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
