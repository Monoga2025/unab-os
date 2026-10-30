from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    telegram_token: str
    allowed_user_id: int | None
    ai_api_key: str
    ai_model: str
    ai_base_url: str
    ai_provider: str
    timezone: ZoneInfo
    db_path: Path
    context_path: Path
    reminder_poll_seconds: int
    coach_enabled: bool
    coach_name: str
    coach_hours: tuple[int, ...]
    coach_poll_seconds: int
    unab_os_bridge_path: Path
    unab_os_bridge_poll_seconds: int
    unab_os_api_url: str | None
    unab_os_bridge_token: str | None
    unab_os_owner_id: str | None

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv()
        missing = [key for key in ("TELEGRAM_BOT_TOKEN",) if not os.getenv(key)]
        if missing:
            raise RuntimeError(f"Faltan variables requeridas: {', '.join(missing)}")

        gateway_base_url = os.getenv("JARVIS_AI_BASE_URL", "").strip().rstrip("/")
        gateway_api_key = os.getenv("JARVIS_AI_API_KEY", "").strip()
        if bool(gateway_base_url) != bool(gateway_api_key):
            raise RuntimeError("JARVIS_AI_BASE_URL y JARVIS_AI_API_KEY deben configurarse juntas")

        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        nvidia_key = (os.getenv("NVIDIA_API") or os.getenv("NVIDIA_API_KEY") or "").strip()
        if gateway_base_url and gateway_api_key:
            ai_api_key = gateway_api_key
            ai_provider = "gateway"
            ai_base_url = gateway_base_url
            ai_model = os.getenv("JARVIS_AI_MODEL", "gpt-5.4-nano").strip() or "gpt-5.4-nano"
        elif openai_key and "reemplaza" not in openai_key:
            ai_api_key = openai_key
            ai_provider = "openai"
            ai_base_url = "https://api.openai.com/v1"
            ai_model = os.getenv("OPENAI_MODEL", "gpt-5.6-luna").strip() or "gpt-5.6-luna"
        elif nvidia_key:
            ai_api_key = nvidia_key
            ai_provider = "nvidia"
            ai_base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
            ai_model = os.getenv("NVIDIA_MODEL", "openai/gpt-oss-20b")
        else:
            raise RuntimeError(
                "Falta JARVIS_AI_BASE_URL/JARVIS_AI_API_KEY, OPENAI_API_KEY "
                "o NVIDIA_API (o NVIDIA_API_KEY)"
            )

        raw_coach_hours = os.getenv("COACH_HOURS", "10,15,20")
        try:
            coach_hours = tuple(sorted({int(value.strip()) for value in raw_coach_hours.split(",")}))
        except ValueError as exc:
            raise RuntimeError("COACH_HOURS debe contener horas separadas por coma") from exc
        if not coach_hours or any(hour < 0 or hour > 23 for hour in coach_hours):
            raise RuntimeError("COACH_HOURS debe contener horas entre 0 y 23")

        return cls(
            telegram_token=os.environ["TELEGRAM_BOT_TOKEN"],
            allowed_user_id=(
                int(os.environ["TELEGRAM_ALLOWED_USER_ID"])
                if os.getenv("TELEGRAM_ALLOWED_USER_ID", "").strip()
                else None
            ),
            ai_api_key=ai_api_key,
            ai_model=ai_model,
            ai_base_url=ai_base_url,
            ai_provider=ai_provider,
            timezone=ZoneInfo(os.getenv("JARVIS_TIMEZONE", "America/Bogota")),
            db_path=Path(os.getenv("JARVIS_DB_PATH", "./data/jarvis.db")).expanduser(),
            context_path=Path(os.getenv("JARVIS_CONTEXT_PATH", "./ACADEMIC_CONTEXT.md")).expanduser(),
            reminder_poll_seconds=max(5, int(os.getenv("REMINDER_POLL_SECONDS", "30"))),
            coach_enabled=os.getenv("COACH_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"},
            coach_name=os.getenv("COACH_NAME", "Monoga").strip() or "Monoga",
            coach_hours=coach_hours,
            coach_poll_seconds=max(30, int(os.getenv("COACH_POLL_SECONDS", "300"))),
            unab_os_bridge_path=Path(
                os.getenv("UNAB_OS_BRIDGE_PATH", "./data/university-os-bridge")
            ).expanduser(),
            unab_os_bridge_poll_seconds=max(5, int(os.getenv("UNAB_OS_BRIDGE_POLL_SECONDS", "15"))),
            unab_os_api_url=os.getenv("UNAB_OS_API_URL", "").strip().rstrip("/") or None,
            unab_os_bridge_token=os.getenv("UNAB_OS_BRIDGE_TOKEN", "").strip() or None,
            unab_os_owner_id=os.getenv("UNAB_OS_OWNER_ID", "").strip() or None,
        )
