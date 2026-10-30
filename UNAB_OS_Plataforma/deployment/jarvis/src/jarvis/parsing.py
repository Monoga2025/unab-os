from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo


@dataclass(frozen=True)
class AddTaskArgs:
    title: str
    subject: str | None = None
    due_at: datetime | None = None


@dataclass(frozen=True)
class ReminderArgs:
    remind_at: datetime
    text: str


@dataclass(frozen=True)
class AcademicEventArgs:
    """A dated academic fact captured without asking an LLM to infer it."""

    subject: str
    event_type: str
    event_date: date
    relative_days: int
    scope_until: str | None = None
    includes_boundary: bool | None = None
    allows_notes: bool | None = None
    format_note: str | None = None


_SUBJECT_ALIASES = (
    (("circuito", "circuitos", "circuitos electricos"), "Circuitos Eléctricos"),
    (("ecuaciones", "ecuaciones diferenciales"), "Ecuaciones Diferenciales"),
    (("estadistica", "estadistica inferencial", "estadistica inferencial y muestreo"), "Estadística Inferencial y Muestreo"),
    (("mecanismo", "mecanismos"), "Mecanismos"),
    (("lab de ondas", "laboratorio de ondas", "laboratorio de ondas y particulas"), "Laboratorio de Ondas y Partículas"),
    (("ondas", "ondas y particulas"), "Ondas y Partículas"),
    (("material", "materiales"), "Materiales"),
    (("dibujo", "dibujo asistido", "dibujo asistido por computador"), "Dibujo Asistido por Computador"),
)


def _fold(value: str) -> str:
    return "".join(
        char
        for char in unicodedata.normalize("NFKD", value.casefold())
        if not unicodedata.combining(char)
    )


def _clean_fragment(value: str) -> str:
    return " ".join(value.strip(" \t\r\n.,;:!?").split())


def _canonical_subject(value: str) -> str:
    cleaned = _clean_fragment(value)
    folded = _fold(cleaned)
    for aliases, canonical in _SUBJECT_ALIASES:
        if folded in aliases:
            return canonical
    return cleaned[:1].upper() + cleaned[1:]


def _canonical_topic(value: str) -> str:
    cleaned = _clean_fragment(value)
    folded = _fold(cleaned)
    if re.fullmatch(r"(?:teorema\s+de\s+)?thev(?:in|enin)", folded):
        return "Teorema de Thévenin"
    return cleaned[:1].upper() + cleaned[1:]


def parse_academic_event(text: str, *, now: datetime, timezone: ZoneInfo) -> AcademicEventArgs | None:
    """Parse a bounded study instruction plus a dated assessment.

    This intentionally handles only explicit facts. It does not infer a quiz
    hour, add academic explanations, or turn arbitrary chat into a task.
    """

    normalized = " ".join(_fold(text).split())
    if not normalized:
        return None

    event_match = re.search(r"\b(quiz|parcial|examen)\b", normalized)
    relative_match = re.search(r"\ben\s+(\d{1,3})\s+dias?\b", normalized)
    if not event_match or not relative_match:
        return None

    days = int(relative_match.group(1))
    if not 1 <= days <= 366:
        return None

    subject_match = re.search(
        r"para\s+la\s+materias?\s+de\s+(.+?)\s+estudiar\b",
        text,
        flags=re.IGNORECASE,
    )
    if not subject_match:
        subject_match = re.search(
            r"\b(?:quiz|parcial|examen)\s+de\s+(.+?)(?=\s+(?:sin|con|y\s+sera)|[.\n]|$)",
            text,
            flags=re.IGNORECASE,
        )
    if not subject_match:
        return None

    scope_match = re.search(
        r"\bestudiar\s+hasta\s+(.+?)(?=\s+sin\s+(?:ver|incluir)(?:lo|la)?\b|[.\n]|$)",
        text,
        flags=re.IGNORECASE,
    )
    scope_until = _canonical_topic(scope_match.group(1)) if scope_match else None
    excludes_boundary = bool(
        scope_match
        and re.search(
            r"\bsin\s+(?:ver|incluir)(?:lo|la)?\b",
            text[scope_match.end():],
            flags=re.IGNORECASE,
        )
    )

    event_type = {
        "quiz": "Quiz",
        "parcial": "Parcial",
        "examen": "Examen",
    }[event_match.group(1)]
    allows_notes = False if "sin apuntes" in normalized else None
    format_note = "Un ejercicio de clase" if re.search(r"\bun\s+ejercicio\s+de\s+clase\b", normalized) else None
    local_now = now.astimezone(timezone)

    return AcademicEventArgs(
        subject=_canonical_subject(subject_match.group(1)),
        event_type=event_type,
        event_date=local_now.date() + timedelta(days=days),
        relative_days=days,
        scope_until=scope_until,
        includes_boundary=False if excludes_boundary else (True if scope_match else None),
        allows_notes=allows_notes,
        format_note=format_note,
    )


def parse_datetime(value: str, *, now: datetime, timezone: ZoneInfo) -> datetime:
    raw = " ".join(value.strip().lower().split())
    local_now = now.astimezone(timezone)
    default_clock = time(20, 0)

    relative = re.fullmatch(r"(hoy|mañana|manana)(?:\s+(?:a\s+las\s+)?(\d{1,2})(?::(\d{2}))?)?", raw)
    if relative:
        days = 0 if relative.group(1) == "hoy" else 1
        hour = int(relative.group(2)) if relative.group(2) else default_clock.hour
        minute = int(relative.group(3)) if relative.group(3) else default_clock.minute
        if hour > 23 or minute > 59:
            raise ValueError("Hora inválida")
        target = local_now.date() + timedelta(days=days)
        return datetime.combine(target, time(hour, minute), timezone)

    iso_match = re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})(?:[ t](\d{1,2})(?::(\d{2}))?)?", raw)
    short_match = re.fullmatch(r"(\d{1,2})/(\d{1,2})(?:/(\d{4}))?(?:\s+(\d{1,2})(?::(\d{2}))?)?", raw)
    if iso_match:
        year, month, day = map(int, iso_match.group(1, 2, 3))
        hour = int(iso_match.group(4) or default_clock.hour)
        minute = int(iso_match.group(5) or default_clock.minute)
    elif short_match:
        day, month = map(int, short_match.group(1, 2))
        year = int(short_match.group(3) or local_now.year)
        hour = int(short_match.group(4) or default_clock.hour)
        minute = int(short_match.group(5) or default_clock.minute)
    else:
        raise ValueError("Fecha no reconocida. Usa 'mañana 18:00', '27/08 20:00' o '2026-08-27 20:00'.")

    try:
        return datetime(year, month, day, hour, minute, tzinfo=timezone)
    except ValueError as exc:
        raise ValueError("Fecha u hora inválida") from exc


def parse_add_command(text: str, *, now: datetime, timezone: ZoneInfo) -> AddTaskArgs:
    parts = [part.strip() for part in text.split("|")]
    if not parts or not parts[0]:
        raise ValueError("Uso: /add tarea | materia | fecha opcional")
    subject = parts[1] or None if len(parts) > 1 else None
    due_at = parse_datetime(parts[2], now=now, timezone=timezone) if len(parts) > 2 and parts[2] else None
    if len(parts) > 3:
        raise ValueError("Demasiados campos. Uso: /add tarea | materia | fecha")
    return AddTaskArgs(parts[0], subject, due_at)


def parse_remind_command(text: str, *, now: datetime, timezone: ZoneInfo) -> ReminderArgs:
    parts = [part.strip() for part in text.split("|", maxsplit=1)]
    if len(parts) != 2 or not all(parts):
        raise ValueError("Uso: /remind fecha | mensaje")
    return ReminderArgs(parse_datetime(parts[0], now=now, timezone=timezone), parts[1])
