from __future__ import annotations

from datetime import datetime


def coach_slot(now: datetime, hours: tuple[int, ...]) -> str | None:
    if now.hour not in hours:
        return None
    return f"{now.date().isoformat()}-{now.hour:02d}"


def build_coach_message(task: dict, now: datetime, name: str) -> str:
    due = datetime.fromisoformat(task["due_at"]) if task.get("due_at") else None
    due_date = datetime.fromisoformat(task["due_date"]).date() if task.get("due_date") else None
    title = task["title"]
    subject = f" · {task['subject']}" if task.get("subject") else ""

    if due_date and due_date < now.date():
        timing = f"La fecha registrada era **{due_date:%d/%m/%Y}** y todavía no la has marcado como terminada."
    elif due_date == now.date():
        timing = "La evaluación es **hoy**; la hora sigue sin estar confirmada."
    elif due_date:
        timing = f"Es tu próximo pendiente para el **{due_date:%d/%m/%Y}**; todavía no hay una hora confirmada."
    elif due and due < now:
        timing = f"El objetivo era **{due:%d/%m a las %H:%M}** y todavía no la has marcado como terminada."
    elif due and due.date() == now.date():
        timing = f"Vence hoy a las **{due:%H:%M}**."
    elif due:
        timing = f"Es tu próximo pendiente y vence **{due:%d/%m a las %H:%M}**."
    else:
        timing = "Sigue pendiente y aún no tiene hora límite registrada."

    return (
        f"## Ey, {name} 👀\n\n"
        f"**{title}**{subject}\n\n"
        f"{timing}\n\n"
        "¿Qué llevas? Respóndeme con tu avance o dime **“ya la terminé”**. "
        "Si sigues en cero, hagamos un bloque de **25 minutos ahora**."
    )
