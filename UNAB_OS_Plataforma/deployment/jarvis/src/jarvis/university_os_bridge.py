from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4


HANDOFF_SCHEMA = "unab-os.study-handoff.v1"
REPORT_SCHEMA = "unab-os.study-report.v1"
REPORT_ENVELOPE_SCHEMA = "unab-os.study-report-envelope.v1"
MAX_DOCUMENT_BYTES = 10_000_000
MAX_ITEMS = 8
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")


class BridgeValidationError(ValueError):
    pass


class BridgeHttpError(BridgeValidationError):
    def __init__(self, status_code: int, detail: str):
        super().__init__(f"Universidad OS respondió {status_code}: {detail}")
        self.status_code = status_code


class ReportConflictError(ValueError):
    pass


@dataclass(frozen=True)
class StudyDocument:
    path: Path
    file_name: str
    mime_type: str
    bytes: int
    sha256: str


@dataclass(frozen=True)
class StudyHandoff:
    id: str
    owner_id: str
    title: str
    subject: str
    topic: str
    prompt: str
    document: StudyDocument
    created_at: str


@dataclass(frozen=True)
class BridgeClaim:
    handoff: StudyHandoff
    path: Path
    telegram_user_id: int | None = None
    telegram_chat_id: int | None = None


def _record(value: Any, *, label: str, keys: set[str]) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != keys:
        raise BridgeValidationError(f"{label} no cumple el contrato esperado")
    return value


def _text(value: Any, *, label: str, maximum: int) -> str:
    if not isinstance(value, str) or value != value.strip() or not value or len(value) > maximum:
        raise BridgeValidationError(f"{label} no es válido")
    return value


def _uuid(value: Any, *, label: str) -> str:
    text = _text(value, label=label, maximum=36)
    try:
        parsed = UUID(text)
    except ValueError as exc:
        raise BridgeValidationError(f"{label} no es un UUID válido") from exc
    if str(parsed) != text.lower():
        raise BridgeValidationError(f"{label} debe usar el formato UUID canónico")
    return str(parsed)


def _timestamp(value: Any, *, label: str) -> str:
    text = _text(value, label=label, maximum=64)
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise BridgeValidationError(f"{label} no es una fecha ISO válida") from exc
    if parsed.tzinfo is None:
        raise BridgeValidationError(f"{label} debe incluir zona horaria")
    return text


def _safe_document_path(raw_path: Any, bridge_root: Path) -> Path:
    text = _text(raw_path, label="document.path", maximum=2048)
    candidate = Path(text).expanduser()
    if not candidate.is_absolute():
        candidate = bridge_root / candidate
    candidate = candidate.resolve()
    root = bridge_root.resolve()
    if candidate == root or root not in candidate.parents:
        raise BridgeValidationError("document.path debe estar dentro del puente")
    if not candidate.is_file():
        raise BridgeValidationError("document.path no existe o no es un archivo")
    return candidate


def _file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_study_prompt(handoff_id: str, subject: str, topic: str) -> str:
    report_example = {
        "schemaVersion": REPORT_SCHEMA,
        "handoffId": handoff_id,
        "summary": "resumen breve y basado en evidencia",
        "strengths": [{"topic": "punto fuerte", "evidence": "respuesta concreta que lo demuestra"}],
        "weaknesses": [{"topic": "punto débil", "evidence": "error o duda concreta que lo demuestra"}],
        "questionsMissed": [{"question": "pregunta fallada", "reason": "qué falló y por qué"}],
        "confidence": "low|medium|high",
        "nextActions": [{"action": "acción de repaso verificable", "minutes": 25}],
    }
    return "\n\n".join((
        f"Vas a actuar como tutor evaluador para {subject}.",
        f"El foco de esta sesión es: {topic}.",
        "Usa únicamente el archivo adjunto y lo que yo responda. No inventes contenidos, fechas ni resultados.",
        "Primero hazme estudiar activamente: formula preguntas de una en una, pide mi razonamiento y corrige con explicación breve.",
        "No me des la solución completa antes de que yo intente responder. Distingue con claridad lo observado de cualquier inferencia.",
        "Al terminar, devuelve solamente un bloque JSON válido, sin Markdown ni texto adicional, con este esquema exacto:",
        json.dumps(report_example, ensure_ascii=False, indent=2),
        "Usa como máximo 8 elementos por lista. minutes debe estar entre 5 y 240.",
        "Este informe es orientativo: no declares que actualiza calificaciones ni dominio académico oficial.",
    ))


def validate_handoff(value: Any, bridge_root: Path) -> StudyHandoff:
    data = _record(
        value,
        label="handoff",
        keys={"schemaVersion", "id", "ownerId", "title", "subject", "topic", "prompt", "document", "createdAt"},
    )
    if data["schemaVersion"] != HANDOFF_SCHEMA:
        raise BridgeValidationError("schemaVersion del handoff no es compatible")
    handoff_id = _uuid(data["id"], label="id")
    document = _record(
        data["document"],
        label="document",
        keys={"path", "fileName", "mimeType", "bytes", "sha256"},
    )
    file_name = _text(document["fileName"], label="document.fileName", maximum=255)
    if file_name in {".", ".."} or "/" in file_name or "\\" in file_name or any(ord(char) < 32 for char in file_name):
        raise BridgeValidationError("document.fileName no es seguro")
    mime_type = _text(document["mimeType"], label="document.mimeType", maximum=100)
    if mime_type not in {"application/pdf", "text/plain"}:
        raise BridgeValidationError("document.mimeType no está permitido")
    byte_count = document["bytes"]
    if not isinstance(byte_count, int) or isinstance(byte_count, bool) or not 1 <= byte_count <= MAX_DOCUMENT_BYTES:
        raise BridgeValidationError("document.bytes no es válido")
    sha256 = _text(document["sha256"], label="document.sha256", maximum=64).lower()
    if not SHA256_PATTERN.fullmatch(sha256):
        raise BridgeValidationError("document.sha256 no es válido")
    path = _safe_document_path(document["path"], bridge_root)
    if path.stat().st_size != byte_count:
        raise BridgeValidationError("el tamaño real del documento no coincide")
    if _file_sha256(path) != sha256:
        raise BridgeValidationError("el hash del documento no coincide")

    return StudyHandoff(
        id=handoff_id,
        owner_id=_text(data["ownerId"], label="ownerId", maximum=128),
        title=_text(data["title"], label="title", maximum=160),
        subject=_text(data["subject"], label="subject", maximum=160),
        topic=_text(data["topic"], label="topic", maximum=160),
        prompt=_text(data["prompt"], label="prompt", maximum=12_000),
        document=StudyDocument(path=path, file_name=file_name, mime_type=mime_type, bytes=byte_count, sha256=sha256),
        created_at=_timestamp(data["createdAt"], label="createdAt"),
    )


def _bounded_items(value: Any, *, label: str) -> list[Any]:
    if not isinstance(value, list) or len(value) > MAX_ITEMS:
        raise BridgeValidationError(f"{label} debe ser una lista de máximo {MAX_ITEMS} elementos")
    return value


def validate_report(value: Any) -> dict[str, Any]:
    data = _record(
        value,
        label="report",
        keys={"schemaVersion", "handoffId", "summary", "strengths", "weaknesses", "questionsMissed", "confidence", "nextActions"},
    )
    if data["schemaVersion"] != REPORT_SCHEMA:
        raise BridgeValidationError("schemaVersion del reporte no es compatible")
    report: dict[str, Any] = {
        "schemaVersion": REPORT_SCHEMA,
        "handoffId": _uuid(data["handoffId"], label="handoffId"),
        "summary": _text(data["summary"], label="summary", maximum=2000),
    }
    confidence = data["confidence"]
    if confidence not in {"low", "medium", "high"}:
        raise BridgeValidationError("confidence no es válido")
    report["confidence"] = confidence

    for field in ("strengths", "weaknesses"):
        entries = []
        for index, item in enumerate(_bounded_items(data[field], label=field)):
            entry = _record(item, label=f"{field}[{index}]", keys={"topic", "evidence"})
            entries.append({
                "topic": _text(entry["topic"], label=f"{field}[{index}].topic", maximum=160),
                "evidence": _text(entry["evidence"], label=f"{field}[{index}].evidence", maximum=1000),
            })
        report[field] = entries

    missed = []
    for index, item in enumerate(_bounded_items(data["questionsMissed"], label="questionsMissed")):
        entry = _record(item, label=f"questionsMissed[{index}]", keys={"question", "reason"})
        missed.append({
            "question": _text(entry["question"], label=f"questionsMissed[{index}].question", maximum=1000),
            "reason": _text(entry["reason"], label=f"questionsMissed[{index}].reason", maximum=1000),
        })
    report["questionsMissed"] = missed

    actions = []
    for index, item in enumerate(_bounded_items(data["nextActions"], label="nextActions")):
        entry = _record(item, label=f"nextActions[{index}]", keys={"action", "minutes"})
        minutes = entry["minutes"]
        if not isinstance(minutes, int) or isinstance(minutes, bool) or not 5 <= minutes <= 240:
            raise BridgeValidationError(f"nextActions[{index}].minutes debe estar entre 5 y 240")
        actions.append({
            "action": _text(entry["action"], label=f"nextActions[{index}].action", maximum=500),
            "minutes": minutes,
        })
    report["nextActions"] = actions
    return report


class UniversityOsBridge:
    def __init__(self, root: str | Path):
        self.root = Path(root).expanduser().resolve()
        self.outbox = self.root / "outbox"
        self.processing = self.root / "processing"
        self.delivered = self.root / "delivered"
        self.failed = self.root / "failed"
        self.reports = self.root / "reports"
        for directory in (self.outbox, self.processing, self.delivered, self.failed, self.reports):
            directory.mkdir(parents=True, exist_ok=True)

    def next_claim(
        self, *, telegram_user_id: int | None = None, telegram_chat_id: int | None = None
    ) -> BridgeClaim | None:
        candidates = [*sorted(self.processing.glob("*.json")), *sorted(self.outbox.glob("*.json"))]
        for candidate in candidates:
            claimed = candidate
            if candidate.parent == self.outbox:
                claimed = self.processing / candidate.name
                try:
                    os.replace(candidate, claimed)
                except FileNotFoundError:
                    continue
            try:
                payload = json.loads(claimed.read_text(encoding="utf-8"))
                return BridgeClaim(validate_handoff(payload, self.root), claimed)
            except (OSError, json.JSONDecodeError, BridgeValidationError):
                self._move_failed(claimed)
        return None

    def delivered_claim(
        self,
        handoff_id: str,
        *,
        telegram_user_id: int | None = None,
        telegram_chat_id: int | None = None,
    ) -> BridgeClaim | None:
        """Return one exact, previously verified handoff for an explicit replay."""
        try:
            canonical_id = str(UUID(handoff_id))
        except (ValueError, AttributeError, TypeError):
            return None
        if canonical_id != handoff_id.lower():
            return None
        path = self.delivered / f"{canonical_id}.json"
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            handoff = validate_handoff(payload, self.root)
        except (OSError, json.JSONDecodeError, BridgeValidationError):
            return None
        if handoff.id != canonical_id:
            return None
        return BridgeClaim(handoff, path)

    def exact_claim(
        self,
        handoff_id: str,
        *,
        telegram_user_id: int | None = None,
        telegram_chat_id: int | None = None,
    ) -> BridgeClaim | None:
        try:
            canonical_id = str(UUID(handoff_id))
        except (ValueError, AttributeError, TypeError):
            return None
        if canonical_id != handoff_id.lower():
            return None
        processing = self.processing / f"{canonical_id}.json"
        outbox = self.outbox / f"{canonical_id}.json"
        claimed = processing
        if not processing.exists():
            try:
                os.replace(outbox, processing)
            except FileNotFoundError:
                return self.delivered_claim(canonical_id)
        try:
            payload = json.loads(claimed.read_text(encoding="utf-8"))
            handoff = validate_handoff(payload, self.root)
        except (OSError, json.JSONDecodeError, BridgeValidationError):
            self._move_failed(claimed)
            return None
        if handoff.id != canonical_id:
            self._move_failed(claimed)
            return None
        return BridgeClaim(handoff, claimed)

    def trusted_owner_id(
        self,
        *,
        telegram_user_id: int | None = None,
        telegram_chat_id: int | None = None,
    ) -> str | None:
        owners: set[str] = set()
        for folder in (self.outbox, self.processing, self.delivered):
            for path in folder.glob("*.json"):
                try:
                    payload = json.loads(path.read_text(encoding="utf-8"))
                    handoff = validate_handoff(payload, self.root)
                    owner = str(UUID(handoff.owner_id))
                except (OSError, json.JSONDecodeError, BridgeValidationError, ValueError, TypeError):
                    continue
                if owner == handoff.owner_id.lower():
                    owners.add(owner)
        return next(iter(owners)) if len(owners) == 1 else None

    def queue_verified_document(
        self,
        *,
        owner_id: str,
        title: str,
        subject: str,
        topic: str,
        source_path: Path,
        file_name: str,
        mime_type: str,
        byte_count: int,
        sha256: str,
        created_at: datetime,
        candidate_id: str | None = None,
        telegram_user_id: int | None = None,
        telegram_chat_id: int | None = None,
    ) -> StudyHandoff:
        owner_id = str(UUID(owner_id))
        handoff_id = str(uuid4())
        if file_name in {".", ".."} or "/" in file_name or "\\" in file_name:
            raise BridgeValidationError("document.fileName no es seguro")
        if mime_type != "application/pdf" or not 1 <= byte_count <= MAX_DOCUMENT_BYTES:
            raise BridgeValidationError("el documento no puede enviarse por Telegram")
        if not SHA256_PATTERN.fullmatch(sha256) or source_path.stat().st_size != byte_count or _file_sha256(source_path) != sha256:
            raise BridgeValidationError("el documento no coincide con la captura verificada")
        document_directory = self.root / "documents" / handoff_id
        document_directory.mkdir(mode=0o700)
        destination = document_directory / file_name
        temporary = document_directory / f".{file_name}.{os.getpid()}.tmp"
        try:
            shutil.copyfile(source_path, temporary)
            os.chmod(temporary, 0o600)
            os.replace(temporary, destination)
            payload = {
                "schemaVersion": HANDOFF_SCHEMA,
                "id": handoff_id,
                "ownerId": owner_id,
                "title": title.strip(),
                "subject": subject.strip(),
                "topic": topic.strip(),
                "prompt": build_study_prompt(handoff_id, subject.strip(), topic.strip()),
                "document": {
                    "path": str(destination),
                    "fileName": file_name,
                    "mimeType": mime_type,
                    "bytes": byte_count,
                    "sha256": sha256,
                },
                "createdAt": created_at.isoformat(),
            }
            handoff = validate_handoff(payload, self.root)
            self._atomic_write_json(self.outbox / f"{handoff_id}.json", payload)
            return handoff
        except Exception:
            temporary.unlink(missing_ok=True)
            shutil.rmtree(document_directory, ignore_errors=True)
            raise

    def mark_delivered(self, claim: BridgeClaim) -> Path:
        destination = self.delivered / f"{claim.handoff.id}.json"
        if claim.path == destination:
            return destination
        os.replace(claim.path, destination)
        return destination

    def save_report(
        self,
        value: Any,
        *,
        received_at: datetime,
        telegram_user_id: int | None = None,
        telegram_chat_id: int | None = None,
    ) -> tuple[dict[str, Any], bool]:
        report = validate_report(value)
        handoff_id = report["handoffId"]
        delivered_path = self.delivered / f"{handoff_id}.json"
        if not delivered_path.is_file():
            raise BridgeValidationError("el handoff no fue entregado por Jarvis")
        try:
            delivered_payload = _record(
                json.loads(delivered_path.read_text(encoding="utf-8")),
                label="handoff entregado",
                keys={"schemaVersion", "id", "ownerId", "title", "subject", "topic", "prompt", "document", "createdAt"},
            )
        except (OSError, json.JSONDecodeError) as exc:
            raise BridgeValidationError("el handoff entregado no se puede verificar") from exc
        if delivered_payload["schemaVersion"] != HANDOFF_SCHEMA or _uuid(delivered_payload["id"], label="id") != handoff_id:
            raise BridgeValidationError("el handoff entregado no coincide con el reporte")
        owner_id = _text(delivered_payload["ownerId"], label="ownerId", maximum=128)
        envelope = {
            "schemaVersion": REPORT_ENVELOPE_SCHEMA,
            "ownerId": owner_id,
            "receivedAt": received_at.isoformat(),
            "report": report,
        }
        destination = self.reports / f"{handoff_id}.json"
        if destination.exists():
            existing = json.loads(destination.read_text(encoding="utf-8"))
            if existing.get("report") == report and existing.get("ownerId") == owner_id:
                return existing, False
            raise ReportConflictError("ya existe un reporte diferente para este handoff")
        self._atomic_write_json(destination, envelope)
        return envelope, True

    def _move_failed(self, path: Path) -> None:
        destination = self.failed / path.name
        if destination.exists():
            destination = self.failed / f"{path.stem}-{os.getpid()}{path.suffix}"
        try:
            os.replace(path, destination)
        except FileNotFoundError:
            pass

    @staticmethod
    def _atomic_write_json(destination: Path, value: Any) -> None:
        descriptor, temporary_name = tempfile.mkstemp(prefix=f".{destination.name}.", suffix=".tmp", dir=destination.parent)
        temporary = Path(temporary_name)
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as output:
                json.dump(value, output, ensure_ascii=False, separators=(",", ":"))
                output.write("\n")
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, destination)
            directory_descriptor = os.open(destination.parent, os.O_RDONLY)
            try:
                os.fsync(directory_descriptor)
            finally:
                os.close(directory_descriptor)
        finally:
            temporary.unlink(missing_ok=True)


class CloudUniversityOsBridge:
    """Scoped HTTPS client for the production bridge; no shared filesystem is assumed."""

    def __init__(self, base_url: str, token: str, owner_id: str | None, cache_root: str | Path):
        self.base_url = base_url.rstrip("/")
        if not self.base_url.startswith("https://") and not self.base_url.startswith("http://localhost"):
            raise BridgeValidationError("UNAB_OS_API_URL debe usar HTTPS")
        if len(token) < 32:
            raise BridgeValidationError("UNAB_OS_BRIDGE_TOKEN es demasiado corto")
        self.token = token
        self.owner_id = str(UUID(owner_id)) if owner_id else None
        self.root = Path(cache_root).expanduser().resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _request(
        self,
        path: str,
        *,
        method: str = "POST",
        payload: Any = None,
        telegram_user_id: int | None = None,
        telegram_chat_id: int | None = None,
    ) -> tuple[int, bytes]:
        body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        if telegram_user_id is not None or telegram_chat_id is not None:
            if (
                not isinstance(telegram_user_id, int)
                or isinstance(telegram_user_id, bool)
                or telegram_user_id <= 0
                or telegram_chat_id != telegram_user_id
            ):
                raise BridgeValidationError("La identidad de Telegram no corresponde a un chat privado")
            headers["X-Telegram-User-Id"] = str(telegram_user_id)
            headers["X-Telegram-Chat-Id"] = str(telegram_chat_id)
        request = urllib.request.Request(
            f"{self.base_url}{path}", data=body, method=method,
            headers=headers,
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as exc:
            if exc.code == 204:
                return 204, b""
            detail = exc.read(2000).decode("utf-8", "replace")
            raise BridgeHttpError(exc.code, detail) from exc
        except urllib.error.URLError as exc:
            raise BridgeValidationError("No se pudo conectar con Universidad OS") from exc

    @staticmethod
    def _recipient(value: Any) -> tuple[int, int]:
        recipient = _record(value, label="recipient", keys={"telegramUserId", "telegramChatId"})
        try:
            telegram_user_id = int(recipient["telegramUserId"])
            telegram_chat_id = int(recipient["telegramChatId"])
        except (TypeError, ValueError) as exc:
            raise BridgeValidationError("La respuesta cloud no tiene un destinatario válido") from exc
        if telegram_user_id <= 0 or telegram_chat_id != telegram_user_id:
            raise BridgeValidationError("La respuesta cloud no corresponde a un chat privado")
        return telegram_user_id, telegram_chat_id

    def _claim(
        self,
        handoff_id: str | None = None,
        *,
        telegram_user_id: int | None = None,
        telegram_chat_id: int | None = None,
    ) -> BridgeClaim | None:
        status, body = self._request(
            "/api/jarvis/bridge/claim",
            payload={"handoffId": handoff_id} if handoff_id else {},
            telegram_user_id=telegram_user_id,
            telegram_chat_id=telegram_chat_id,
        )
        if status == 204 or not body:
            return None
        envelope = _record(json.loads(body), label="respuesta cloud", keys={"handoff", "replay", "recipient"})
        payload = envelope["handoff"]
        recipient_user_id, recipient_chat_id = self._recipient(envelope["recipient"])
        if telegram_user_id is not None and (
            recipient_user_id != telegram_user_id or recipient_chat_id != telegram_chat_id
        ):
            raise BridgeValidationError("El handoff cloud pertenece a otro destinatario")
        document = _record(payload["document"], label="document", keys={"path", "fileName", "mimeType", "bytes", "sha256"})
        handoff_id = _uuid(payload["id"], label="id")
        document_dir = self.root / "documents" / handoff_id
        document_dir.mkdir(parents=True, exist_ok=True)
        file_name = _text(document["fileName"], label="fileName", maximum=255)
        if "/" in file_name or "\\" in file_name or file_name in {".", ".."}:
            raise BridgeValidationError("document.fileName no es seguro")
        destination = document_dir / file_name
        doc_status, content = self._request(
            f"/api/jarvis/bridge/handoffs/{handoff_id}/document",
            method="GET",
            telegram_user_id=recipient_user_id,
            telegram_chat_id=recipient_chat_id,
        )
        if doc_status != 200:
            raise BridgeValidationError("No se pudo descargar el documento privado")
        if len(content) != document["bytes"] or hashlib.sha256(content).hexdigest() != document["sha256"]:
            raise BridgeValidationError("El documento cloud no coincide con tamaño/hash")
        temporary = document_dir / f".{file_name}.{os.getpid()}.tmp"
        temporary.write_bytes(content)
        os.chmod(temporary, 0o600)
        os.replace(temporary, destination)
        local_payload = {**payload, "document": {**document, "path": str(destination)}}
        handoff = validate_handoff(local_payload, self.root)
        claim_path = self.root / f"{handoff.id}.cloud"
        claim_path.touch(exist_ok=True)
        return BridgeClaim(handoff, claim_path, recipient_user_id, recipient_chat_id)

    def next_claim(
        self, *, telegram_user_id: int | None = None, telegram_chat_id: int | None = None
    ) -> BridgeClaim | None:
        return self._claim(
            telegram_user_id=telegram_user_id,
            telegram_chat_id=telegram_chat_id,
        )

    def exact_claim(
        self,
        handoff_id: str,
        *,
        telegram_user_id: int | None = None,
        telegram_chat_id: int | None = None,
    ) -> BridgeClaim | None:
        return self._claim(
            handoff_id,
            telegram_user_id=telegram_user_id,
            telegram_chat_id=telegram_chat_id,
        )

    def delivered_claim(
        self,
        handoff_id: str,
        *,
        telegram_user_id: int | None = None,
        telegram_chat_id: int | None = None,
    ) -> BridgeClaim | None:
        return self._claim(
            handoff_id,
            telegram_user_id=telegram_user_id,
            telegram_chat_id=telegram_chat_id,
        )

    def trusted_owner_id(
        self,
        *,
        telegram_user_id: int | None = None,
        telegram_chat_id: int | None = None,
    ) -> str | None:
        if telegram_user_id is None and telegram_chat_id is None:
            return self.owner_id
        status, body = self._request(
            "/api/jarvis/bridge/identity",
            method="GET",
            telegram_user_id=telegram_user_id,
            telegram_chat_id=telegram_chat_id,
        )
        if status != 200:
            return None
        identity = _record(json.loads(body), label="identidad cloud", keys={"linked", "ownerId", "legacy"})
        if identity["linked"] is not True:
            return None
        return _uuid(identity["ownerId"], label="ownerId")

    def link(self, code: str, *, telegram_user_id: int, telegram_chat_id: int) -> bool:
        try:
            status, body = self._request(
                "/api/jarvis/bridge/link",
                payload={"code": code},
                telegram_user_id=telegram_user_id,
                telegram_chat_id=telegram_chat_id,
            )
        except BridgeHttpError as exc:
            if exc.status_code == 400:
                return False
            raise
        if status != 201:
            return False
        payload = _record(json.loads(body), label="enlace cloud", keys={"linked"})
        return payload["linked"] is True

    def queue_verified_document(
        self, *, owner_id: str, title: str, subject: str, topic: str,
        source_path: Path, file_name: str, mime_type: str, byte_count: int,
        sha256: str, created_at: datetime, candidate_id: str | None = None,
        telegram_user_id: int | None = None, telegram_chat_id: int | None = None,
    ) -> StudyHandoff:
        canonical_owner_id = str(UUID(owner_id))
        if not candidate_id:
            raise BridgeValidationError("El material no tiene una identidad cloud verificable")
        status, body = self._request("/api/jarvis/bridge/handoffs", payload={
            "candidateId": candidate_id, "title": title, "subject": subject, "topic": topic,
        }, telegram_user_id=telegram_user_id, telegram_chat_id=telegram_chat_id)
        if status != 201:
            raise BridgeValidationError("No se pudo preparar el handoff cloud")
        handoff_id = json.loads(body)["id"]
        return StudyHandoff(
            id=_uuid(handoff_id, label="id"), owner_id=canonical_owner_id,
            title=title.strip(), subject=subject.strip(), topic=topic.strip(),
            prompt=build_study_prompt(handoff_id, subject.strip(), topic.strip()),
            document=StudyDocument(
                path=source_path, file_name=file_name, mime_type=mime_type,
                bytes=byte_count, sha256=sha256,
            ),
            created_at=created_at.isoformat(),
        )

    def mark_delivered(self, claim: BridgeClaim) -> Path:
        self._request(
            f"/api/jarvis/bridge/handoffs/{claim.handoff.id}/delivered",
            payload={},
            telegram_user_id=claim.telegram_user_id,
            telegram_chat_id=claim.telegram_chat_id,
        )
        return claim.path

    def save_report(
        self,
        value: Any,
        *,
        received_at: datetime,
        telegram_user_id: int | None = None,
        telegram_chat_id: int | None = None,
    ) -> tuple[dict[str, Any], bool]:
        report = validate_report(value)
        status, body = self._request(
            "/api/jarvis/bridge/reports",
            payload=report,
            telegram_user_id=telegram_user_id,
            telegram_chat_id=telegram_chat_id,
        )
        if status not in {200, 201}:
            raise BridgeValidationError("Universidad OS rechazó el informe")
        envelope = json.loads(body)
        created = bool(envelope.pop("created", status == 201))
        return envelope, created
