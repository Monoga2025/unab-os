from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from openai import OpenAI

from .db import Database
from .parsing import parse_datetime


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "crear_tarea",
            "description": "Crea una tarea académica para el usuario.",
            "parameters": {
                "type": "object",
                "properties": {
                    "titulo": {"type": "string"},
                    "materia": {"type": ["string", "null"]},
                    "fecha": {
                        "type": ["string", "null"],
                        "description": "Fecha local: mañana 18:00, DD/MM HH:MM o YYYY-MM-DD HH:MM",
                    },
                },
                "required": ["titulo", "materia", "fecha"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_tareas",
            "description": "Lista las tareas pendientes del usuario.",
            "parameters": {"type": "object", "properties": {}, "required": [], "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "completar_tarea",
            "description": "Marca una tarea como completada por su identificador numérico.",
            "parameters": {
                "type": "object",
                "properties": {"id": {"type": "integer"}},
                "required": ["id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "programar_recordatorio",
            "description": "Programa un recordatorio personal por Telegram.",
            "parameters": {
                "type": "object",
                "properties": {"mensaje": {"type": "string"}, "fecha": {"type": "string"}},
                "required": ["mensaje", "fecha"],
                "additionalProperties": False,
            },
        },
    },
]

AI_DAILY_TURN_LIMIT = 30
AI_MONTHLY_TURN_LIMIT = 300
AI_QUOTA_TIMEZONE = ZoneInfo("America/Bogota")
MAX_AI_COMPLETIONS_PER_TURN = 3


class JarvisAssistant:
    def __init__(
        self,
        db: Database,
        api_key: str,
        model: str,
        timezone,
        context_path: Path,
        *,
        base_url: str = "https://api.openai.com/v1",
        provider: str = "openai",
    ):
        self.db = db
        self.client = OpenAI(api_key=api_key, base_url=base_url, timeout=60, max_retries=1)
        self.model = model
        self.provider = provider
        self.timezone = timezone
        self.context_path = context_path

    def _completion_request(self, messages: list[dict[str, Any]]) -> dict[str, Any]:
        request: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "tools": TOOLS,
            "tool_choice": "auto",
        }
        if self.provider == "openai":
            request["reasoning_effort"] = "none"
            request["max_completion_tokens"] = 1200
        else:
            request["max_tokens"] = 1200
            request["temperature"] = 0.2
            request["top_p"] = 0.7
        return request

    def _instructions(self) -> str:
        context = self.context_path.read_text(encoding="utf-8") if self.context_path.exists() else ""
        return (
            "Eres Jarvis, orquestador académico personal de un estudiante de ingeniería de la UNAB. "
            "Responde siempre en español colombiano, cálido, directo y práctico. "
            "Tu misión es organizar la ejecución: decidir la siguiente acción, mantener tareas y recordatorios, "
            "y coordinar handoffs de estudio entre Universidad OS, Telegram y ChatGPT. "
            "No actúes como tutor ni expliques contenido académico: el prompt y el material verificado se entregan "
            "a ChatGPT, y Jarvis recibe el JSON final para Universidad OS. "
            "Prioriza primero entregas vencidas o próximas y después parciales. No inventes fechas ni temas. "
            "Usa las herramientas cuando el usuario pida crear, consultar o completar tareas o recordatorios. "
            "Antes de crear algo confirma en una frase qué entendiste; si una fecha es ambigua, pide confirmación. "
            "Cuando coordines estudio, indica solo la siguiente acción operativa y termina con una acción verificable. "
            "Nunca afirmes que adjuntaste o vas a adjuntar un PDF, diapositivas o archivos desde el chat libre; "
            "los materiales solo se entregan mediante un handoff verificado de Universidad OS. "
            "Da formato con Markdown sencillo: títulos con ##, negrita con **texto**, listas y código con `backticks`. "
            "No uses tablas, HTML ni sintaxis MarkdownV2; en Telegram las listas cortas se leen mejor. "
            f"Fecha y hora local actual: {datetime.now(self.timezone):%Y-%m-%d %H:%M}. "
            "Contexto editable:\n\n" + context
        )

    def _run_tool(self, name: str, arguments: dict[str, Any], user_id: int, now: datetime) -> dict[str, Any]:
        if name == "crear_tarea":
            due = parse_datetime(arguments["fecha"], now=now, timezone=self.timezone) if arguments["fecha"] else None
            subject = arguments["materia"]
            if isinstance(subject, str) and subject.strip().lower() in {"null", "none", "ninguna"}:
                subject = None
            task_id = self.db.add_task(user_id, arguments["titulo"], subject, due, now=now)
            return {"ok": True, "id": task_id}
        if name == "listar_tareas":
            return {"ok": True, "tareas": self.db.list_tasks(user_id)}
        if name == "completar_tarea":
            return {"ok": self.db.complete_task(user_id, arguments["id"], now=now)}
        if name == "programar_recordatorio":
            remind_at = parse_datetime(arguments["fecha"], now=now, timezone=self.timezone)
            if remind_at <= now:
                raise ValueError("El recordatorio debe quedar en el futuro")
            reminder_id = self.db.add_reminder(user_id, arguments["mensaje"], remind_at, now=now)
            return {"ok": True, "id": reminder_id, "fecha": remind_at.isoformat()}
        return {"ok": False, "error": "Herramienta desconocida"}

    @staticmethod
    def _quota_message(denied_by: str | None) -> str:
        if denied_by == "monthly":
            return (
                "## Límite mensual de Jarvis\n\n"
                "Ya usaste los **300 turnos inteligentes** disponibles este mes. "
                "La cuota vuelve a empezar el primer día del próximo mes, según la hora de Bogotá.\n\n"
                "Las tareas, recordatorios, fechas y entregas de materiales verificadas siguen funcionando."
            )
        return (
            "## Límite diario de Jarvis\n\n"
            "Ya usaste los **30 turnos inteligentes** disponibles hoy. "
            "La cuota vuelve a empezar mañana, según la hora de Bogotá.\n\n"
            "Las tareas, recordatorios, fechas y entregas de materiales verificadas siguen funcionando."
        )

    def reply(self, user_id: int, text: str, *, now: datetime | None = None) -> str:
        now = now or datetime.now(self.timezone)
        self.db.add_message(user_id, "user", text, now=now)
        instruction_role = "developer" if self.provider == "openai" else "system"
        messages: list[dict[str, Any]] = [
            {"role": instruction_role, "content": self._instructions()},
            *self.db.recent_messages(user_id),
        ]

        quota_now = now.astimezone(AI_QUOTA_TIMEZONE)
        quota = self.db.reserve_ai_turn(
            user_id,
            now=quota_now,
            daily_limit=AI_DAILY_TURN_LIMIT,
            monthly_limit=AI_MONTHLY_TURN_LIMIT,
        )
        if not quota.allowed:
            answer = self._quota_message(quota.denied_by)
            self.db.add_message(user_id, "assistant", answer, now=now)
            return answer

        reservation = quota.reservation
        if reservation is None:  # Defensive: AiTurnReservationResult.allowed guarantees it.
            raise RuntimeError("La reserva de IA no quedó disponible")
        completion_received = False

        for _ in range(MAX_AI_COMPLETIONS_PER_TURN):
            try:
                response = self.client.chat.completions.create(**self._completion_request(messages))
            except Exception:
                # Only a failure before any provider response can safely return
                # the reservation. After a response, spend is already possible.
                if not completion_received:
                    try:
                        self.db.release_ai_turn(reservation)
                    except Exception:
                        # Fail closed: a stale reservation still counts and can
                        # never allow accidental overspend.
                        pass
                raise

            if not completion_received:
                # Commit before inspecting or executing tool calls: receiving a
                # completion is already billable, even if its payload is bad.
                completion_received = True
                if not self.db.commit_ai_turn(reservation, now=quota_now):
                    raise RuntimeError("No se pudo confirmar el consumo del turno de IA")

            message = response.choices[0].message
            calls = message.tool_calls or []
            if not calls:
                answer = (message.content or "").strip() or "No pude generar una respuesta. Inténtalo de nuevo."
                self.db.add_message(user_id, "assistant", answer, now=now)
                return answer
            messages.append(
                {
                    "role": "assistant",
                    "content": message.content or "",
                    "tool_calls": [
                        {
                            "id": call.id,
                            "type": "function",
                            "function": {"name": call.function.name, "arguments": call.function.arguments},
                        }
                        for call in calls
                    ],
                }
            )
            for call in calls:
                try:
                    result = self._run_tool(call.function.name, json.loads(call.function.arguments), user_id, now)
                except (ValueError, KeyError) as exc:
                    result = {"ok": False, "error": str(exc)}
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.id,
                        "content": json.dumps(result, ensure_ascii=False),
                    }
                )
        answer = (
            "El turno alcanzó el límite seguro de tres pasos del orquestador. "
            "Revisá las tareas o recordatorios creados y enviame una instrucción más corta para continuar."
        )
        self.db.add_message(user_id, "assistant", answer, now=now)
        return answer
