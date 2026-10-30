from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Iterator


def _iso(value: datetime | None) -> str | None:
    return value.isoformat(timespec="seconds") if value else None


@dataclass(frozen=True)
class AiTurnReservation:
    id: int
    user_id: int
    local_day: str
    local_month: str


@dataclass(frozen=True)
class AiTurnReservationResult:
    reservation: AiTurnReservation | None
    denied_by: str | None
    daily_used: int
    monthly_used: int

    @property
    def allowed(self) -> bool:
        return self.reservation is not None


class Database:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.initialize()

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def initialize(self) -> None:
        with self.connect() as connection:
            connection.executescript(
                """
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    subject TEXT,
                    due_at TEXT,
                    due_date TEXT,
                    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'done')),
                    created_at TEXT NOT NULL,
                    completed_at TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due
                    ON tasks(user_id, status, due_at);
                CREATE TABLE IF NOT EXISTS reminders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    remind_at TEXT NOT NULL,
                    sent INTEGER NOT NULL DEFAULT 0 CHECK(sent IN (0, 1)),
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_reminders_due
                    ON reminders(sent, remind_at);
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_messages_user_id
                    ON messages(user_id, id);
                CREATE TABLE IF NOT EXISTS coach_nudges (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    task_id INTEGER NOT NULL,
                    slot TEXT NOT NULL,
                    sent_at TEXT NOT NULL,
                    UNIQUE(user_id, task_id, slot)
                );
                CREATE TABLE IF NOT EXISTS preferences (
                    user_id INTEGER NOT NULL,
                    key TEXT NOT NULL,
                    value TEXT NOT NULL,
                    PRIMARY KEY(user_id, key)
                );
                CREATE TABLE IF NOT EXISTS academic_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    subject TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    event_date TEXT NOT NULL,
                    event_time TEXT,
                    scope_until TEXT,
                    includes_boundary INTEGER CHECK(includes_boundary IN (0, 1) OR includes_boundary IS NULL),
                    allows_notes INTEGER CHECK(allows_notes IN (0, 1) OR allows_notes IS NULL),
                    format_note TEXT,
                    source_text TEXT NOT NULL,
                    task_id INTEGER,
                    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'done')),
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(user_id, subject, event_type, event_date)
                );
                CREATE INDEX IF NOT EXISTS idx_academic_events_user_date
                    ON academic_events(user_id, status, event_date);
                CREATE TABLE IF NOT EXISTS ai_turn_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    local_day TEXT NOT NULL,
                    local_month TEXT NOT NULL,
                    state TEXT NOT NULL DEFAULT 'reserved'
                        CHECK(state IN ('reserved', 'committed')),
                    reserved_at TEXT NOT NULL,
                    committed_at TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_ai_turn_usage_user_day
                    ON ai_turn_usage(user_id, local_day, state);
                CREATE INDEX IF NOT EXISTS idx_ai_turn_usage_user_month
                    ON ai_turn_usage(user_id, local_month, state);
                """
            )
            # Existing Railway volumes predate date-only deadlines. SQLite
            # cannot add this column through CREATE TABLE IF NOT EXISTS.
            task_columns = {
                row["name"] for row in connection.execute("PRAGMA table_info(tasks)").fetchall()
            }
            if "due_date" not in task_columns:
                connection.execute("ALTER TABLE tasks ADD COLUMN due_date TEXT")
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due_date "
                "ON tasks(user_id, status, due_date)"
            )

    def reserve_ai_turn(
        self,
        user_id: int,
        *,
        now: datetime,
        daily_limit: int = 30,
        monthly_limit: int = 300,
    ) -> AiTurnReservationResult:
        """Atomically reserve one outer generative turn for a Telegram user.

        Both pending reservations and committed turns count against the limits.
        This is intentionally conservative: if the process dies after an
        upstream call, an uncertain reservation can never create extra spend.
        """

        if user_id <= 0:
            raise ValueError("El usuario de Telegram debe ser positivo")
        if daily_limit <= 0 or monthly_limit <= 0 or daily_limit > monthly_limit:
            raise ValueError("Los límites de IA deben ser positivos y el mensual no puede ser menor")
        if now.tzinfo is None or now.utcoffset() is None:
            raise ValueError("La reserva de IA requiere una fecha con zona horaria")

        local_day = now.date().isoformat()
        local_month = local_day[:7]
        timestamp = _iso(now)
        with self.connect() as connection:
            # BEGIN IMMEDIATE serializes the read-count-insert sequence across
            # worker threads/processes, so concurrent requests cannot overshoot.
            connection.execute("BEGIN IMMEDIATE")
            counts = connection.execute(
                "SELECT "
                "COUNT(*) FILTER (WHERE local_day = ?) AS daily_used, "
                "COUNT(*) FILTER (WHERE local_month = ?) AS monthly_used "
                "FROM ai_turn_usage WHERE user_id = ?",
                (local_day, local_month, user_id),
            ).fetchone()
            daily_used = int(counts["daily_used"])
            monthly_used = int(counts["monthly_used"])
            if monthly_used >= monthly_limit:
                return AiTurnReservationResult(None, "monthly", daily_used, monthly_used)
            if daily_used >= daily_limit:
                return AiTurnReservationResult(None, "daily", daily_used, monthly_used)

            cursor = connection.execute(
                "INSERT INTO ai_turn_usage("
                "user_id, local_day, local_month, state, reserved_at"
                ") VALUES (?, ?, ?, 'reserved', ?)",
                (user_id, local_day, local_month, timestamp),
            )
            reservation = AiTurnReservation(
                id=int(cursor.lastrowid),
                user_id=user_id,
                local_day=local_day,
                local_month=local_month,
            )
            return AiTurnReservationResult(
                reservation,
                None,
                daily_used + 1,
                monthly_used + 1,
            )

    def commit_ai_turn(
        self,
        reservation: AiTurnReservation,
        *,
        now: datetime,
    ) -> bool:
        """Commit a reservation immediately after the first completion arrives."""

        with self.connect() as connection:
            cursor = connection.execute(
                "UPDATE ai_turn_usage SET state = 'committed', committed_at = ? "
                "WHERE id = ? AND user_id = ? AND state = 'reserved'",
                (_iso(now), reservation.id, reservation.user_id),
            )
            return cursor.rowcount == 1

    def release_ai_turn(self, reservation: AiTurnReservation) -> bool:
        """Release only an uncommitted first-call failure."""

        with self.connect() as connection:
            cursor = connection.execute(
                "DELETE FROM ai_turn_usage "
                "WHERE id = ? AND user_id = ? AND state = 'reserved'",
                (reservation.id, reservation.user_id),
            )
            return cursor.rowcount == 1

    def ai_turn_usage(self, user_id: int, *, now: datetime) -> dict[str, int]:
        local_day = now.date().isoformat()
        local_month = local_day[:7]
        with self.connect() as connection:
            row = connection.execute(
                "SELECT "
                "COUNT(*) FILTER (WHERE local_day = ?) AS daily_used, "
                "COUNT(*) FILTER (WHERE local_month = ?) AS monthly_used, "
                "COUNT(*) FILTER (WHERE local_day = ? AND state = 'reserved') AS reserved, "
                "COUNT(*) FILTER (WHERE local_day = ? AND state = 'committed') AS committed "
                "FROM ai_turn_usage WHERE user_id = ?",
                (local_day, local_month, local_day, local_day, user_id),
            ).fetchone()
            return {
                "daily_used": int(row["daily_used"]),
                "monthly_used": int(row["monthly_used"]),
                "reserved": int(row["reserved"]),
                "committed": int(row["committed"]),
            }

    def add_task(
        self,
        user_id: int,
        title: str,
        subject: str | None = None,
        due_at: datetime | None = None,
        *,
        now: datetime | None = None,
    ) -> int:
        title = title.strip()
        if not title:
            raise ValueError("La tarea no puede estar vacía")
        subject = subject.strip() if subject else None
        now = now or datetime.now().astimezone()
        with self.connect() as connection:
            existing = connection.execute(
                "SELECT id FROM tasks WHERE user_id = ? AND status = 'pending' "
                "AND title = ? AND subject IS ? AND due_at IS ? AND due_date IS NULL ORDER BY id LIMIT 1",
                (user_id, title, subject, _iso(due_at)),
            ).fetchone()
            if existing:
                return int(existing["id"])
            cursor = connection.execute(
                "INSERT INTO tasks(user_id, title, subject, due_at, created_at) VALUES (?, ?, ?, ?, ?)",
                (user_id, title, subject, _iso(due_at), _iso(now)),
            )
            return int(cursor.lastrowid)

    def list_tasks(self, user_id: int, *, include_done: bool = False) -> list[dict]:
        sql = "SELECT * FROM tasks WHERE user_id = ?"
        params: list[object] = [user_id]
        if not include_done:
            sql += " AND status = 'pending'"
        sql += (
            " ORDER BY (due_at IS NULL AND due_date IS NULL), "
            "COALESCE(due_at, due_date || 'T23:59:59'), id"
        )
        with self.connect() as connection:
            return [dict(row) for row in connection.execute(sql, params).fetchall()]

    def list_pending_task_user_ids(self, *, limit: int = 500) -> list[int]:
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT DISTINCT user_id FROM tasks WHERE status = 'pending' ORDER BY user_id LIMIT ?",
                (limit,),
            ).fetchall()
            return [int(row["user_id"]) for row in rows]

    def capture_academic_event(
        self,
        user_id: int,
        *,
        subject: str,
        event_type: str,
        event_date: date,
        scope_until: str | None,
        includes_boundary: bool | None,
        allows_notes: bool | None,
        format_note: str | None,
        source_text: str,
        now: datetime,
    ) -> tuple[dict, bool]:
        """Upsert one dated academic fact and its date-only preparation task."""

        subject = subject.strip()
        event_type = event_type.strip()
        source_text = source_text.strip()
        if not subject or not event_type or not source_text:
            raise ValueError("El evento académico está incompleto")
        event_date_text = event_date.isoformat()
        timestamp = _iso(now)
        task_title = f"Preparar {event_type}"
        if scope_until:
            boundary = "sin incluirlo" if includes_boundary is False else "incluyéndolo"
            task_title += f": hasta {scope_until} ({boundary})"

        with self.connect() as connection:
            existing = connection.execute(
                "SELECT id, task_id FROM academic_events "
                "WHERE user_id = ? AND subject = ? AND event_type = ? AND event_date = ?",
                (user_id, subject, event_type, event_date_text),
            ).fetchone()
            created = existing is None

            if existing:
                event_id = int(existing["id"])
                connection.execute(
                    "UPDATE academic_events SET scope_until = ?, includes_boundary = ?, "
                    "allows_notes = ?, format_note = ?, source_text = ?, updated_at = ? WHERE id = ?",
                    (
                        scope_until,
                        None if includes_boundary is None else int(includes_boundary),
                        None if allows_notes is None else int(allows_notes),
                        format_note,
                        source_text,
                        timestamp,
                        event_id,
                    ),
                )
            else:
                cursor = connection.execute(
                    "INSERT INTO academic_events("
                    "user_id, subject, event_type, event_date, event_time, scope_until, "
                    "includes_boundary, allows_notes, format_note, source_text, created_at, updated_at"
                    ") VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        user_id,
                        subject,
                        event_type,
                        event_date_text,
                        scope_until,
                        None if includes_boundary is None else int(includes_boundary),
                        None if allows_notes is None else int(allows_notes),
                        format_note,
                        source_text,
                        timestamp,
                        timestamp,
                    ),
                )
                event_id = int(cursor.lastrowid)

            linked_task_id = int(existing["task_id"]) if existing and existing["task_id"] else None
            task = None
            if linked_task_id:
                task = connection.execute(
                    "SELECT id FROM tasks WHERE id = ? AND user_id = ? AND status = 'pending'",
                    (linked_task_id, user_id),
                ).fetchone()
                if task:
                    connection.execute(
                        "UPDATE tasks SET title = ?, subject = ?, due_at = NULL, due_date = ? WHERE id = ?",
                        (task_title, subject, event_date_text, linked_task_id),
                    )
            if not task:
                task = connection.execute(
                    "SELECT id FROM tasks WHERE user_id = ? AND status = 'pending' "
                    "AND title = ? AND subject = ? AND due_at IS NULL AND due_date = ? "
                    "ORDER BY id LIMIT 1",
                    (user_id, task_title, subject, event_date_text),
                ).fetchone()
            if task:
                task_id = int(task["id"])
            else:
                cursor = connection.execute(
                    "INSERT INTO tasks(user_id, title, subject, due_at, due_date, created_at) "
                    "VALUES (?, ?, ?, NULL, ?, ?)",
                    (user_id, task_title, subject, event_date_text, timestamp),
                )
                task_id = int(cursor.lastrowid)
            connection.execute(
                "UPDATE academic_events SET task_id = ? WHERE id = ?",
                (task_id, event_id),
            )
            row = connection.execute(
                "SELECT * FROM academic_events WHERE id = ?", (event_id,)
            ).fetchone()
            return dict(row), created

    def list_academic_events(self, user_id: int, *, include_done: bool = False) -> list[dict]:
        sql = "SELECT * FROM academic_events WHERE user_id = ?"
        if not include_done:
            sql += " AND status = 'pending'"
        sql += " ORDER BY event_date, id"
        with self.connect() as connection:
            return [dict(row) for row in connection.execute(sql, (user_id,)).fetchall()]

    def complete_task(self, user_id: int, task_id: int, *, now: datetime | None = None) -> bool:
        now = now or datetime.now().astimezone()
        with self.connect() as connection:
            cursor = connection.execute(
                "UPDATE tasks SET status = 'done', completed_at = ? "
                "WHERE id = ? AND user_id = ? AND status = 'pending'",
                (_iso(now), task_id, user_id),
            )
            return cursor.rowcount == 1

    def add_reminder(
        self,
        user_id: int,
        text: str,
        remind_at: datetime,
        *,
        now: datetime | None = None,
    ) -> int:
        text = text.strip()
        if not text:
            raise ValueError("El recordatorio no puede estar vacío")
        now = now or datetime.now().astimezone()
        with self.connect() as connection:
            cursor = connection.execute(
                "INSERT INTO reminders(user_id, text, remind_at, created_at) VALUES (?, ?, ?, ?)",
                (user_id, text, _iso(remind_at), _iso(now)),
            )
            return int(cursor.lastrowid)

    def due_reminders(self, now: datetime, *, limit: int = 50) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT * FROM reminders WHERE sent = 0 AND remind_at <= ? ORDER BY remind_at LIMIT ?",
                (_iso(now), limit),
            ).fetchall()
            return [dict(row) for row in rows]

    def mark_reminder_sent(self, reminder_id: int) -> bool:
        with self.connect() as connection:
            cursor = connection.execute(
                "UPDATE reminders SET sent = 1 WHERE id = ? AND sent = 0", (reminder_id,)
            )
            return cursor.rowcount == 1

    def add_message(self, user_id: int, role: str, content: str, *, now: datetime | None = None) -> None:
        now = now or datetime.now().astimezone()
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO messages(user_id, role, content, created_at) VALUES (?, ?, ?, ?)",
                (user_id, role, content, _iso(now)),
            )

    def recent_messages(self, user_id: int, *, limit: int = 12) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT role, content FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT ?",
                (user_id, limit),
            ).fetchall()
            return [dict(row) for row in reversed(rows)]

    def reset_messages(self, user_id: int) -> int:
        with self.connect() as connection:
            cursor = connection.execute("DELETE FROM messages WHERE user_id = ?", (user_id,))
            return cursor.rowcount

    def claim_coach_nudge(self, user_id: int, task_id: int, slot: str, *, now: datetime) -> bool:
        with self.connect() as connection:
            cursor = connection.execute(
                "INSERT OR IGNORE INTO coach_nudges(user_id, task_id, slot, sent_at) VALUES (?, ?, ?, ?)",
                (user_id, task_id, slot, _iso(now)),
            )
            return cursor.rowcount == 1

    def set_preference(self, user_id: int, key: str, value: str) -> None:
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO preferences(user_id, key, value) VALUES (?, ?, ?) "
                "ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value",
                (user_id, key, value),
            )

    def get_preference(self, user_id: int, key: str, default: str | None = None) -> str | None:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT value FROM preferences WHERE user_id = ? AND key = ?", (user_id, key)
            ).fetchone()
            return row["value"] if row else default

    def delete_preference(self, user_id: int, key: str) -> bool:
        with self.connect() as connection:
            cursor = connection.execute(
                "DELETE FROM preferences WHERE user_id = ? AND key = ?", (user_id, key)
            )
            return cursor.rowcount == 1
