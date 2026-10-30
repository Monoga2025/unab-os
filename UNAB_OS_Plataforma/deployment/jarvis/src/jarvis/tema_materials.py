from __future__ import annotations

import hashlib
import json
import os
import re
import unicodedata
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


MAX_MANIFEST_BYTES = 2_000_000
MAX_FILES = 5_000
MAX_DOCUMENT_BYTES = 10_000_000
CANDIDATE_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
STOP_WORDS = {"a", "al", "de", "del", "el", "en", "estudiar", "la", "las", "los", "para", "por", "un", "una"}
COURSE_ALIASES = {
    "calculo": "ecuaciones diferenciales",
    "ecuacion": "ecuaciones diferenciales",
    "ecuaciones": "ecuaciones diferenciales",
    "edo": "ecuaciones diferenciales",
    "estadistica": "estadistica inferencial y muestreo",
    "circuitos": "circuitos electricos",
    "dibujo": "dibujo asistido por computador",
    "materiales": "materiales",
    "mecanismos": "mecanismos",
    "ondas": "ondas y particulas",
}


class TemaCatalogError(RuntimeError):
    pass


@dataclass(frozen=True)
class TemaMaterial:
    candidate_id: str
    course: str
    section: str
    title: str
    mime_type: str
    bytes: int
    sha256: str
    local_relative_path: str

    @property
    def file_name(self) -> str:
        return Path(self.local_relative_path).name


@dataclass(frozen=True)
class MaterialSearch:
    query: str
    course: str | None
    materials: tuple[TemaMaterial, ...]
    courses: tuple[str, ...]


def search_materials(materials: tuple[TemaMaterial, ...], query: str) -> MaterialSearch:
    courses = tuple(sorted({item.course for item in materials}, key=normalize))
    normalized_query = normalize(query)
    query_words = set(normalized_query.split())
    matched_aliases = {alias for alias in COURSE_ALIASES if alias in query_words}
    alias_target = next((COURSE_ALIASES[alias] for alias in matched_aliases), None)
    query_tokens = _tokens(alias_target or normalized_query)
    matching_courses = [course for course in courses if query_tokens and query_tokens <= _tokens(course)]
    if len(matching_courses) != 1:
        return MaterialSearch(query=query, course=None, materials=(), courses=tuple(matching_courses or courses))
    course = matching_courses[0]
    course_materials = [item for item in materials if item.course == course]
    course_tokens = _tokens(course) | _tokens(alias_target or "") | matched_aliases
    topic_tokens = _tokens(normalized_query) - course_tokens
    if topic_tokens:
        narrowed = [
            item for item in course_materials
            if topic_tokens <= (_tokens(item.title) | _tokens(item.section))
        ]
        if narrowed:
            course_materials = narrowed
    return MaterialSearch(query=query, course=course, materials=tuple(course_materials), courses=(course,))


def normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value.casefold())
    ascii_text = "".join(char for char in decomposed if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", ascii_text).strip()


def _tokens(value: str) -> set[str]:
    return {token for token in normalize(value).split() if token not in STOP_WORDS}


def _safe_text(value: Any, *, label: str, maximum: int = 500) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > maximum or "\0" in value:
        raise TemaCatalogError(f"El manifiesto TEMA tiene {label} inválido.")
    return value.strip()


def _parse_material(value: Any) -> TemaMaterial | None:
    if not isinstance(value, dict) or value.get("status") != "downloaded":
        return None
    if value.get("content_type") != "application/pdf":
        return None
    candidate_id = _safe_text(value.get("candidate_id"), label="candidate_id", maximum=128)
    if not CANDIDATE_PATTERN.fullmatch(candidate_id):
        raise TemaCatalogError("El manifiesto TEMA tiene un candidate_id inseguro.")
    course = value.get("course")
    section = value.get("section")
    activity = value.get("activity")
    if not isinstance(course, dict) or not isinstance(section, dict) or not isinstance(activity, dict):
        raise TemaCatalogError("El manifiesto TEMA tiene metadatos incompletos.")
    byte_count = value.get("bytes")
    if not isinstance(byte_count, int) or isinstance(byte_count, bool) or not 1 <= byte_count <= MAX_DOCUMENT_BYTES:
        return None
    sha256 = _safe_text(value.get("sha256"), label="sha256", maximum=64).lower()
    if not SHA256_PATTERN.fullmatch(sha256):
        raise TemaCatalogError("El manifiesto TEMA tiene un hash inválido.")
    relative_path = _safe_text(value.get("local_relative_path"), label="ruta local", maximum=2048)
    path = Path(relative_path)
    if path.is_absolute() or ".." in path.parts:
        raise TemaCatalogError("El manifiesto TEMA contiene una ruta insegura.")
    return TemaMaterial(
        candidate_id=candidate_id,
        course=_safe_text(course.get("name"), label="nombre de materia"),
        section=_safe_text(section.get("title"), label="sección"),
        title=_safe_text(activity.get("name"), label="nombre de material"),
        mime_type="application/pdf",
        bytes=byte_count,
        sha256=sha256,
        local_relative_path=relative_path,
    )


class TemaMaterialCatalog:
    def __init__(self, root: str | Path | None = None):
        configured = root or os.getenv("TEMA_DATA_ROOT")
        self.root = Path(configured).expanduser().resolve() if configured else Path.home() / ".local/share/unab-os/tema"
        self.manifest_path = self.root / "download-manifest.json"
        self.downloads_root = self.root / "downloads"

    def load(self) -> tuple[TemaMaterial, ...]:
        try:
            metadata = self.manifest_path.stat()
            if self.manifest_path.is_symlink() or not self.manifest_path.is_file() or metadata.st_size > MAX_MANIFEST_BYTES:
                raise TemaCatalogError("El manifiesto TEMA no es un archivo válido.")
            payload = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        except FileNotFoundError as exc:
            raise TemaCatalogError("No existe una captura local de TEMA.") from exc
        except (OSError, json.JSONDecodeError) as exc:
            raise TemaCatalogError("No se pudo leer la captura local de TEMA.") from exc
        if not isinstance(payload, dict) or payload.get("private") is not True:
            raise TemaCatalogError("La captura TEMA no está marcada como privada.")
        files = payload.get("files")
        if not isinstance(files, list) or len(files) > MAX_FILES:
            raise TemaCatalogError("La lista de materiales TEMA no es válida.")
        parsed = tuple(material for item in files if (material := _parse_material(item)) is not None)
        if len({item.candidate_id for item in parsed}) != len(parsed):
            raise TemaCatalogError("La captura TEMA contiene identificadores duplicados.")
        return parsed

    def search(self, query: str) -> MaterialSearch:
        return search_materials(self.load(), query)

    def by_candidate_id(self, candidate_id: str) -> TemaMaterial | None:
        if not CANDIDATE_PATTERN.fullmatch(candidate_id):
            return None
        return next((item for item in self.load() if item.candidate_id == candidate_id), None)

    def verified_path(self, material: TemaMaterial) -> Path:
        root = self.downloads_root.resolve(strict=True)
        candidate = self.downloads_root / material.local_relative_path
        current = self.downloads_root
        for component in Path(material.local_relative_path).parts:
            current = current / component
            if current.is_symlink():
                raise TemaCatalogError("El material TEMA contiene un enlace simbólico.")
        path = candidate.resolve(strict=True)
        if root not in path.parents or not path.is_file() or path.stat().st_size != material.bytes:
            raise TemaCatalogError("El archivo TEMA cambió desde la captura.")
        digest = hashlib.sha256()
        with path.open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                digest.update(chunk)
        if digest.hexdigest() != material.sha256:
            raise TemaCatalogError("El archivo TEMA no coincide con su hash verificado.")
        return path

    def generated_at(self) -> datetime | None:
        try:
            payload = json.loads(self.manifest_path.read_text(encoding="utf-8"))
            raw = payload.get("generated_at") if isinstance(payload, dict) else None
            return datetime.fromisoformat(raw.replace("Z", "+00:00")) if isinstance(raw, str) else None
        except (OSError, ValueError, json.JSONDecodeError):
            return None


class CloudTemaMaterialCatalog:
    """Read-only catalog fetched from the scoped Universidad OS bridge API."""

    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip("/")
        self.token = token

    @staticmethod
    def _telegram_headers(telegram_user_id: int, telegram_chat_id: int) -> dict[str, str]:
        if (
            not isinstance(telegram_user_id, int)
            or isinstance(telegram_user_id, bool)
            or telegram_user_id <= 0
            or telegram_chat_id != telegram_user_id
        ):
            raise TemaCatalogError("La consulta cloud requiere un chat privado de Telegram enlazado.")
        return {
            "X-Telegram-User-Id": str(telegram_user_id),
            "X-Telegram-Chat-Id": str(telegram_chat_id),
        }

    def load(self, *, telegram_user_id: int, telegram_chat_id: int) -> tuple[TemaMaterial, ...]:
        request = urllib.request.Request(
            f"{self.base_url}/api/jarvis/bridge/catalog",
            headers={
                "Authorization": f"Bearer {self.token}",
                **self._telegram_headers(telegram_user_id, telegram_chat_id),
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = json.loads(response.read())
        except (urllib.error.URLError, json.JSONDecodeError) as exc:
            raise TemaCatalogError("No se pudo consultar el catálogo cloud de TEMA.") from exc
        values = payload.get("materials") if isinstance(payload, dict) else None
        if not isinstance(values, list) or len(values) > MAX_FILES:
            raise TemaCatalogError("El catálogo cloud de TEMA no es válido.")
        parsed = []
        for value in values:
            if not isinstance(value, dict):
                raise TemaCatalogError("El catálogo cloud contiene un material inválido.")
            candidate_id = _safe_text(value.get("candidateId"), label="candidateId", maximum=128)
            byte_count = value.get("bytes")
            if not CANDIDATE_PATTERN.fullmatch(candidate_id):
                raise TemaCatalogError("El catálogo cloud contiene integridad inválida.")
            if not isinstance(byte_count, int) or isinstance(byte_count, bool) or not 1 <= byte_count <= MAX_DOCUMENT_BYTES:
                continue
            if value.get("mimeType") != "application/pdf":
                continue
            file_name = _safe_text(value.get("fileName"), label="fileName", maximum=255)
            if file_name in {".", ".."} or "/" in file_name or "\\" in file_name:
                raise TemaCatalogError("El catálogo cloud contiene un nombre inseguro.")
            parsed.append(TemaMaterial(
                candidate_id=candidate_id,
                course=_safe_text(value.get("course"), label="materia"),
                section=_safe_text(value.get("section"), label="sección"),
                title=_safe_text(value.get("title"), label="título", maximum=1000),
                mime_type="application/pdf",
                bytes=byte_count,
                # The catalog does not expose content hashes. The exact claim
                # later carries and verifies the server-side SHA-256 before a
                # document is delivered.
                sha256="0" * 64,
                local_relative_path=file_name,
            ))
        if len({item.candidate_id for item in parsed}) != len(parsed):
            raise TemaCatalogError("El catálogo cloud contiene identificadores duplicados.")
        return tuple(parsed)

    def search(
        self, query: str, *, telegram_user_id: int, telegram_chat_id: int
    ) -> MaterialSearch:
        return search_materials(
            self.load(telegram_user_id=telegram_user_id, telegram_chat_id=telegram_chat_id),
            query,
        )

    def by_candidate_id(
        self, candidate_id: str, *, telegram_user_id: int, telegram_chat_id: int
    ) -> TemaMaterial | None:
        if not CANDIDATE_PATTERN.fullmatch(candidate_id):
            return None
        return next((
            item
            for item in self.load(
                telegram_user_id=telegram_user_id,
                telegram_chat_id=telegram_chat_id,
            )
            if item.candidate_id == candidate_id
        ), None)

    def generated_at(self) -> datetime | None:
        return None
