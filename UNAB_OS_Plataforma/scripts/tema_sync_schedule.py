"""Scheduling rules for the finite TEMA synchronization job."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

BOGOTA = ZoneInfo("America/Bogota")


def parse_timestamp(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def latest_daily_boundary(now: datetime) -> datetime:
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    local_now = now.astimezone(BOGOTA)
    boundary = local_now.replace(hour=5, minute=0, second=0, microsecond=0)
    if local_now < boundary:
        boundary -= timedelta(days=1)
    return boundary.astimezone(timezone.utc)


RETRY_BACKOFF = timedelta(hours=1)


def connection_due(row: dict[str, Any], now: datetime | None = None, *, force: bool = False) -> bool:
    if force:
        return True
    current = now or datetime.now(timezone.utc)
    last_synced = parse_timestamp(row.get("last_synced_at"))
    requested = parse_timestamp(row.get("sync_requested_at"))
    last_attempted = parse_timestamp(row.get("last_attempted_at"))
    request_pending = requested is not None and (last_synced is None or requested > last_synced)
    if request_pending and (last_attempted is None or requested > last_attempted):
        return True
    daily_pending = last_synced is None or last_synced < latest_daily_boundary(current)
    if not request_pending and not daily_pending:
        return False
    return last_attempted is None or last_attempted <= current.astimezone(timezone.utc) - RETRY_BACKOFF
