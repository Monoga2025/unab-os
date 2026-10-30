#!/usr/bin/env python3
"""Read-only, multi-student TEMA (Moodle) synchronizer for Universidad OS."""

from __future__ import annotations

import base64
import hashlib
import hmac
import html
import json
import math
import os
import re
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import requests
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from tema_file_identity import stable_candidate_id
from tema_snapshot_policy import completeness_map
from tema_sync_schedule import connection_due

TEMA_ORIGIN = "https://tema.unab.edu.co"
REST_URL = f"{TEMA_ORIGIN}/webservice/rest/server.php"
MAX_FILE_BYTES = 100 * 1024 * 1024
MAX_EXTRACTED_TEXT_CHARS = 24_000
TEXT_EXTRACTION_TIMEOUT_SECONDS = 8
TIMEOUT = (20, 120)
RECENT_ACCESS_SECONDS = 45 * 24 * 60 * 60
CURRENT_TERM_START_SECONDS = 240 * 24 * 60 * 60


class SyncError(RuntimeError):
    pass


@dataclass(frozen=True)
class TextExtraction:
    status: str
    text: str | None


def _bounded_extracted_text(value: str) -> str:
    normalized = value.replace("\r\n", "\n").replace("\r", "\n").replace("\x00", "").strip()
    return normalized[:MAX_EXTRACTED_TEXT_CHARS]


def _run_pdftotext(path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["pdftotext", "-layout", str(path), "-"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=TEXT_EXTRACTION_TIMEOUT_SECONDS,
        check=False,
        shell=False,
    )


def extract_file_text(path: Path, content_type: str) -> TextExtraction:
    normalized_type = content_type.split(";", 1)[0].strip().casefold()
    if normalized_type == "application/pdf":
        try:
            result = _run_pdftotext(path)
        except (OSError, subprocess.SubprocessError):
            return TextExtraction("failed", None)
        if result.returncode != 0:
            return TextExtraction("failed", None)
        text = _bounded_extracted_text(result.stdout)
        return TextExtraction("ready", text) if text else TextExtraction("ocr_needed", None)

    if normalized_type == "text/plain":
        try:
            text = path.read_bytes().decode("utf-8", errors="strict")
        except (OSError, UnicodeDecodeError):
            return TextExtraction("failed", None)
        return TextExtraction("ready", _bounded_extracted_text(text))

    return TextExtraction("unsupported", None)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def unix_iso(value: Any) -> str | None:
    try:
        seconds = int(value)
    except (TypeError, ValueError):
        return None
    return datetime.fromtimestamp(seconds, timezone.utc).isoformat().replace("+00:00", "Z") if seconds > 0 else None


def text_only(value: Any, limit: int = 50_000) -> str | None:
    if not value:
        return None
    cleaned = re.sub(r"<[^>]+>", " ", html.unescape(str(value)))
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:limit] or None


def official_url(value: Any, fallback: str | None = None) -> str | None:
    raw = str(value or fallback or "").strip()
    if not raw:
        return None
    parsed = urlparse(raw)
    if parsed.scheme != "https" or parsed.netloc != "tema.unab.edu.co":
        return None
    safe_query = [(key, val) for key, val in parse_qsl(parsed.query) if key.lower() not in {"token", "wstoken"}]
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", urlencode(safe_query), ""))


def module_date(module: dict[str, Any], words: tuple[str, ...]) -> str | None:
    for item in module.get("dates") or []:
        label = text_only(item.get("label"), 200) or ""
        if any(word in label.casefold() for word in words):
            return unix_iso(item.get("timestamp"))
    return None


def b64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def decrypt_token(envelope: str, key_text: str) -> str:
    parts = envelope.split(".")
    if len(parts) != 4 or parts[0] != "v1":
        raise SyncError("Invalid TEMA token envelope.")
    key = hashlib.sha256(key_text.encode()).digest()
    nonce, ciphertext, tag = map(b64url_decode, parts[1:])
    token = AESGCM(key).decrypt(nonce, ciphertext + tag, b"universidad-os:tema-token:v1").decode()
    if not re.fullmatch(r"[A-Za-z0-9]{16,256}", token):
        raise SyncError("Invalid decrypted TEMA token.")
    return token


@dataclass(frozen=True)
class Connection:
    owner_id: str
    token: str
    token_fingerprint: str


class Supabase:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.headers = {"apikey": key, "Authorization": f"Bearer {key}"}

    def request(self, method: str, table: str, *, params=None, payload=None, prefer=None):
        headers = {**self.headers, "Content-Type": "application/json"}
        if prefer:
            headers["Prefer"] = prefer
        response = requests.request(method, f"{self.url}/rest/v1/{table}", params=params, json=payload, headers=headers, timeout=TIMEOUT)
        if not response.ok:
            raise SyncError(f"Supabase {table} returned {response.status_code}: {response.text[:300]}")
        return response.json() if response.content else None

    def select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        value = self.request("GET", table, params=params)
        return value if isinstance(value, list) else []

    def insert_one(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        rows = self.request("POST", table, payload=payload, prefer="return=representation")
        if not isinstance(rows, list) or not rows:
            raise SyncError(f"Supabase did not return inserted {table} row.")
        return rows[0]

    def upsert(self, table: str, rows: list[dict[str, Any]], conflict: str) -> None:
        for index in range(0, len(rows), 100):
            self.request("POST", table, params={"on_conflict": conflict}, payload=rows[index:index + 100], prefer="resolution=merge-duplicates,return=minimal")

    def patch(self, table: str, filters: dict[str, str], payload: dict[str, Any]) -> None:
        self.request("PATCH", table, params=filters, payload=payload, prefer="return=minimal")

    def rpc(self, function: str, payload: dict[str, Any]) -> Any:
        return self.request("POST", f"rpc/{function}", payload=payload)

    def upload(self, object_name: str, path: Path, content_type: str) -> None:
        encoded = "/".join(requests.utils.quote(part, safe="") for part in object_name.split("/"))
        with path.open("rb") as stream:
            response = requests.post(
                f"{self.url}/storage/v1/object/tema-private/{encoded}",
                headers={**self.headers, "Content-Type": content_type, "x-upsert": "true", "Cache-Control": "private, max-age=0"},
                data=stream,
                timeout=TIMEOUT,
            )
        if not response.ok:
            raise SyncError(f"Storage upload returned {response.status_code}.")


class Moodle:
    def __init__(self, token: str):
        self.token = token

    def call(self, function: str, **params: Any) -> Any:
        response = requests.post(
            REST_URL,
            data={"wstoken": self.token, "wsfunction": function, "moodlewsrestformat": "json", **params},
            headers={"Accept": "application/json", "User-Agent": "Universidad-OS/1.0"},
            timeout=TIMEOUT,
        )
        if not response.ok:
            raise SyncError(f"TEMA {function} returned {response.status_code}.")
        payload = response.json()
        if isinstance(payload, dict) and (payload.get("exception") or payload.get("error")):
            raise SyncError(str(payload.get("message") or payload.get("error") or f"TEMA rejected {function}."))
        return payload

    def download(self, url_value: str, target: Path) -> tuple[int, str, str]:
        parsed = urlparse(url_value)
        if parsed.scheme != "https" or parsed.netloc != "tema.unab.edu.co":
            raise SyncError("Untrusted TEMA file host.")
        params = dict(parse_qsl(parsed.query))
        params["token"] = self.token
        url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", urlencode(params), ""))
        digest, size = hashlib.sha256(), 0
        with requests.get(url, stream=True, allow_redirects=False, timeout=TIMEOUT) as response:
            if not response.ok:
                raise SyncError(f"TEMA file returned {response.status_code}.")
            content_type = response.headers.get("content-type", "application/octet-stream").split(";", 1)[0].strip().lower()
            if content_type in {"text/html", "application/xhtml+xml"}:
                raise SyncError("TEMA returned an HTML login page instead of a file.")
            declared = int(response.headers.get("content-length") or 0)
            if declared > MAX_FILE_BYTES:
                raise SyncError("TEMA file exceeds 100 MB.")
            with target.open("wb") as output:
                for chunk in response.iter_content(64 * 1024):
                    if not chunk:
                        continue
                    size += len(chunk)
                    if size > MAX_FILE_BYTES:
                        raise SyncError("TEMA file exceeds 100 MB.")
                    digest.update(chunk)
                    output.write(chunk)
        if size == 0:
            raise SyncError("TEMA returned an empty file.")
        return size, digest.hexdigest(), content_type


def source_id(item: dict[str, Any], fallback: str) -> str:
    return str(item.get("id") or item.get("iteminstance") or fallback)[:300]


def active_state(course: dict[str, Any], now_seconds: float, active_course_ids: set[str] | None = None) -> str:
    start = int(course.get("startdate") or 0)
    end = int(course.get("enddate") or 0)
    last_access = int(course.get("lastaccess") or 0)
    progress = source_progress(course.get("progress"))
    if active_course_ids is not None and str(course.get("id")) in active_course_ids:
        return "active"
    if end and end < now_seconds:
        return "historical"
    if start and start > now_seconds:
        return "unknown"
    if end and end >= now_seconds:
        return "active"
    if last_access and 0 <= now_seconds - last_access <= RECENT_ACCESS_SECONDS:
        return "active"
    if progress is not None and 0 < progress < 100:
        return "active"
    if start and 0 <= now_seconds - start <= CURRENT_TERM_START_SECONDS:
        return "active"
    if progress == 100 or active_course_ids is not None:
        return "historical"
    return "unknown"


def safe_name(value: Any, fallback: str) -> str:
    name = re.sub(r"[\\/\x00-\x1f]+", "-", str(value or fallback)).strip(" .")
    return name[:255] or fallback


def source_progress(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    result = float(value)
    return result if math.isfinite(result) and 0 <= result <= 100 else None


def course_source_metadata(moodle: Moodle, enrolled: list[dict[str, Any]], warnings: list[str]) -> dict[str, dict[str, Any]]:
    metadata = {
        str(course["id"]): {
            "category_name": text_only(course.get("categoryname"), 1000),
            "progress_percent": source_progress(course.get("progress")),
        }
        for course in enrolled
    }
    course_ids = ",".join(str(course["id"]) for course in enrolled if course.get("id") is not None)
    if not course_ids:
        return metadata
    try:
        payload = moodle.call("core_course_get_courses_by_field", field="ids", value=course_ids)
        details = payload.get("courses") if isinstance(payload, dict) else None
        for detail in details or []:
            course_id = str(detail.get("id") or "")
            if course_id not in metadata:
                continue
            category_name = text_only(detail.get("categoryname"), 1000)
            if category_name:
                metadata[course_id]["category_name"] = category_name
    except Exception as error:
        warnings.append(f"Categorías de cursos: {error}"[:500])
    return metadata


def active_course_ids(moodle: Moodle, warnings: list[str]) -> set[str] | None:
    try:
        payload = moodle.call(
            "core_course_get_enrolled_courses_by_timeline_classification",
            classification="inprogress",
            limit=0,
            offset=0,
            sort="fullname",
        )
        courses = payload.get("courses") if isinstance(payload, dict) else None
        if not isinstance(courses, list):
            raise SyncError("TEMA returned an invalid in-progress course list.")
        return {str(course["id"]) for course in courses if course.get("id") is not None}
    except Exception as error:
        warnings.append(f"Materias activas: {error}"[:500])
        return None


def grade_items(moodle: Moodle, course_id: Any, user_id: Any, warnings: list[str]) -> list[dict[str, Any]]:
    try:
        payload = moodle.call("gradereport_user_get_grade_items", courseid=course_id, userid=user_id, groupid=0)
        users = payload.get("usergrades") if isinstance(payload, dict) else None
        return (users[0].get("gradeitems") or []) if users and isinstance(users[0], dict) else []
    except Exception as error:
        warnings.append(f"Notas del curso {course_id}: {error}"[:500])
        return []


def forum_announcements(moodle: Moodle, course_id: Any, modules: list[dict[str, Any]], warnings: list[str]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for module in modules:
        if module.get("modname") != "forum" or not module.get("instance"):
            continue
        try:
            payload = moodle.call("mod_forum_get_forum_discussions_paginated", forumid=module["instance"], page=0, perpage=20, sortby="timemodified", sortdirection="DESC")
            for discussion in (payload.get("discussions") or []) if isinstance(payload, dict) else []:
                discussion_id = source_id(discussion, f"forum-{module['id']}")
                results.append({
                    "source_id": discussion_id,
                    "title": str(discussion.get("name") or module.get("name") or "Aviso")[:1000],
                    "excerpt": text_only(discussion.get("message"), 10_000),
                    "author_name": text_only(discussion.get("userfullname"), 500),
                    "posted_at": unix_iso(discussion.get("timemodified") or discussion.get("created")),
                    "official_url": f"{TEMA_ORIGIN}/mod/forum/discuss.php?d={discussion_id}",
                })
        except Exception as error:
            warnings.append(f"Avisos de {module.get('name') or course_id}: {error}"[:500])
    return results


def sync_connection(db: Supabase, connection: Connection) -> dict[str, Any]:
    owner, moodle = connection.owner_id, Moodle(connection.token)
    run = db.insert_one("tema_sync_runs", {"owner_id": owner, "status": "running"})
    run_id, captured_at, warnings = run["id"], now_iso(), []
    try:
        connection_filter = {
            "owner_id": f"eq.{owner}",
            "status": "eq.connected",
            "token_fingerprint": f"eq.{connection.token_fingerprint}",
        }
        db.patch("tema_connections", connection_filter, {"last_attempted_at": captured_at, "updated_at": captured_at})
        site = moodle.call("core_webservice_get_site_info")
        user_id = site.get("userid") if isinstance(site, dict) else None
        if not user_id:
            raise SyncError("TEMA did not return the authenticated user.")
        enrolled = moodle.call("core_enrol_get_users_courses", userid=user_id)
        if not isinstance(enrolled, list):
            raise SyncError("TEMA did not return courses.")
        source_metadata = course_source_metadata(moodle, enrolled, warnings)
        in_progress_ids = active_course_ids(moodle, warnings)
        snapshots = []
        for course in enrolled:
            try:
                contents = moodle.call("core_course_get_contents", courseid=course["id"])
                if not isinstance(contents, list):
                    raise SyncError("invalid course contents")
                snapshots.append((course, contents))
            except Exception as error:
                warnings.append(f"{course.get('fullname') or course.get('id')}: {error}"[:500])
        if enrolled and not snapshots:
            raise SyncError("No course returned a usable snapshot; last-good catalog preserved.")

        now_seconds = datetime.now(timezone.utc).timestamp()
        course_payload = [{
            "source_id": str(course["id"]), "name": str(course.get("fullname") or course.get("shortname") or "Materia"),
            "short_name": text_only(course.get("shortname"), 500), "official_url": f"{TEMA_ORIGIN}/course/view.php?id={course['id']}",
            "summary_text": text_only(course.get("summary")), "format": text_only(course.get("format"), 100), "access_failed": False,
            "category_name": source_metadata[str(course["id"])]["category_name"],
            "progress_percent": source_metadata[str(course["id"])]["progress_percent"],
            "starts_at": unix_iso(course.get("startdate")), "ends_at": unix_iso(course.get("enddate")), "last_access_at": unix_iso(course.get("lastaccess")),
            "active_state": active_state(course, now_seconds, in_progress_ids),
        } for course in enrolled]

        section_payload, flat_modules = [], []
        for course, contents in snapshots:
            for index, section in enumerate(contents):
                section_source = str(section.get("id") if section.get("id") is not None else index)
                section_payload.append({"course_source_id": str(course["id"]), "source_id": section_source,
                    "title": str(section.get("name") or f"Sección {index + 1}"), "position": int(section.get("section") or index),
                    "summary_text": text_only(section.get("summary")), "visible": section.get("visible") != 0})
                flat_modules.extend((course, section_source, module) for module in section.get("modules") or [])

        activity_payload = []
        for course, section_source, module in flat_modules:
            activity_payload.append({"course_source_id": str(course["id"]), "section_source_id": section_source,
                "source_id": str(module["id"]), "name": str(module.get("name") or module.get("modname") or "Actividad"), "module_type": str(module.get("modname") or "resource"),
                "official_url": official_url(module.get("url"), f"{TEMA_ORIGIN}/course/view.php?id={course['id']}"), "description_text": text_only(module.get("description") or module.get("intro")),
                "visible": module.get("visible") != 0, "availability_text": [str(module["availabilityinfo"])] if module.get("availabilityinfo") else [],
                "candidate_names": [str(item.get("filename") or "Archivo") for item in module.get("contents") or [] if item.get("fileurl")],
                "opens_at": module_date(module, ("open", "apertura", "desde")), "due_at": module_date(module, ("due", "cierre", "entrega", "hasta")),
                "completion_state": "submitted" if (module.get("completiondata") or {}).get("state", 0) > 0 else "unknown"})

        core_complete = len(snapshots) == len(enrolled)
        grades_complete = True
        announcements_complete = core_complete
        files_complete = core_complete
        grade_payload, announcement_payload = [], []
        modules_by_course: dict[str, list[dict[str, Any]]] = {}
        for course, _, module in flat_modules:
            modules_by_course.setdefault(str(course["id"]), []).append(module)
        for course in enrolled:
            course_source = str(course["id"])
            warning_count = len(warnings)
            course_grades = grade_items(moodle, course["id"], user_id, warnings)
            if len(warnings) > warning_count:
                grades_complete = False
            for index, item in enumerate(course_grades):
                if item.get("itemtype") in {"course", "category"} or not item.get("itemname"):
                    continue
                grade_payload.append({"course_source_id": course_source, "source_id": source_id(item, f"grade-{index}"),
                    "item_name": str(item["itemname"]), "item_type": str(item.get("itemtype") or "grade"), "module_type": text_only(item.get("itemmodule"), 160),
                    "grade_display": text_only(item.get("gradedisplay") or item.get("gradeformatted"), 500), "grade_raw": item.get("graderaw") if isinstance(item.get("graderaw"), (int, float)) else None,
                    "grade_min": item.get("grademin") if isinstance(item.get("grademin"), (int, float)) else None, "grade_max": item.get("grademax") if isinstance(item.get("grademax"), (int, float)) else None,
                    "feedback_text": text_only(item.get("feedback")), "graded_at": unix_iso(item.get("gradedategraded") or item.get("grademodified")),
                    "official_url": f"{TEMA_ORIGIN}/grade/report/user/index.php?id={course['id']}"})
            if course_source not in modules_by_course:
                continue
            warning_count = len(warnings)
            course_announcements = forum_announcements(moodle, course["id"], modules_by_course.get(course_source, []), warnings)
            if len(warnings) > warning_count:
                announcements_complete = False
            for announcement in course_announcements:
                announcement_payload.append({"course_source_id": course_source, **announcement})

        existing = db.select("tema_files", {"select": "candidate_id,sha256,storage_object_name,extracted_text,text_extraction_status", "owner_id": f"eq.{owner}"})
        by_candidate = {row["candidate_id"]: row for row in existing}
        extraction_rank = {"ready": 4, "ocr_needed": 3, "unsupported": 2, "failed": 1, "not_extracted": 0}
        by_sha: dict[str, dict[str, Any]] = {}
        for row in existing:
            digest = str(row["sha256"])
            current = by_sha.get(digest)
            if current is None or extraction_rank.get(str(row.get("text_extraction_status")), -1) > extraction_rank.get(str(current.get("text_extraction_status")), -1):
                by_sha[digest] = row
        file_rows, text_enrichments = [], []
        seen_candidates: set[str] = set()
        with tempfile.TemporaryDirectory(prefix="universidad-os-tema-") as temp:
            for course, section_source, module in flat_modules:
                for item in module.get("contents") or []:
                    if not item.get("fileurl"):
                        continue
                    file_name = safe_name(item.get("filename"), "archivo-tema")
                    try:
                        candidate = stable_candidate_id(module["id"], item)
                        if candidate in seen_candidates:
                            continue
                        seen_candidates.add(candidate)
                        file_name = safe_name(item.get("filename"), f"archivo-{candidate}")
                        target = Path(temp) / candidate
                        size, digest, content_type = moodle.download(str(item["fileurl"]), target)
                        prior, duplicate = by_candidate.get(candidate), by_sha.get(digest)
                        suffix = Path(file_name).suffix.lower()[:11] or ".bin"
                        object_name = prior["storage_object_name"] if prior and prior["sha256"] == digest else duplicate["storage_object_name"] if duplicate else f"{owner}/tema/{candidate}/{digest}-{candidate}{suffix}"
                        if not ((prior and prior["sha256"] == digest) or duplicate):
                            db.upload(object_name, target, content_type)
                        reusable = by_sha.get(digest)
                        reusable_status = str((reusable or {}).get("text_extraction_status") or "not_extracted")
                        if reusable and reusable_status != "not_extracted":
                            extraction = TextExtraction(reusable_status, reusable.get("extracted_text"))
                        else:
                            try:
                                extraction = extract_file_text(target, content_type)
                            except Exception:
                                # Enrichment is deliberately weaker than catalog availability.
                                extraction = TextExtraction("failed", None)
                        file_rows.append({"candidate_id": candidate, "course_source_id": str(course["id"]), "section_source_id": section_source,
                            "activity_source_id": str(module["id"]),
                            "activity_name": str(module.get("name") or "Recurso"), "file_name": file_name, "file_type": str(item.get("type") or "file"), "content_type": content_type,
                            "size_bytes": size, "sha256": digest, "storage_bucket": "tema-private", "storage_object_name": object_name,
                            "source_url": official_url(item.get("fileurl"))})
                        text_enrichments.append({"candidate_id": candidate, "sha256": digest,
                            "extracted_text": extraction.text, "text_extraction_status": extraction.status})
                    except Exception as error:
                        files_complete = False
                        warnings.append(f"{file_name}: {error}"[:500])

        status = "partial" if warnings else "complete"
        db.rpc("publish_tema_snapshot", {
            "p_owner_id": owner,
            "p_token_fingerprint": connection.token_fingerprint,
            "p_run_id": run_id,
            "p_moodle_user_id": int(user_id),
            "p_captured_at": captured_at,
            "p_status": status,
            "p_warnings": warnings[:100],
            "p_complete_scopes": completeness_map(
                core_complete=core_complete,
                files_complete=files_complete,
                grades_complete=grades_complete,
                announcements_complete=announcements_complete,
            ),
            "p_courses": course_payload,
            "p_sections": section_payload,
            "p_activities": activity_payload,
            "p_files": file_rows,
            "p_grades": grade_payload,
            "p_announcements": announcement_payload,
        })
        enrichment_failures = 0
        for enrichment in text_enrichments:
            try:
                db.patch("tema_files", {
                    "owner_id": f"eq.{owner}",
                    "candidate_id": f"eq.{enrichment['candidate_id']}",
                    "sha256": f"eq.{enrichment['sha256']}",
                }, {
                    "extracted_text": enrichment["extracted_text"],
                    "text_extraction_status": enrichment["text_extraction_status"],
                })
            except Exception:
                # Text is optional enrichment. Never invalidate the published catalog.
                enrichment_failures += 1
        return {"ownerId": owner, "status": status, "courses": len(snapshots), "activities": len(activity_payload), "files": len(file_rows), "grades": len(grade_payload), "announcements": len(announcement_payload), "warnings": len(warnings), "textEnrichmentFailures": enrichment_failures}
    except Exception as error:
        db.patch("tema_sync_runs", {
            "id": f"eq.{run_id}",
            "owner_id": f"eq.{owner}",
            "status": "eq.running",
        }, {"status": "failed", "finished_at": now_iso(), "error_message": str(error)[:1000]})
        db.patch("tema_connections", {
            "owner_id": f"eq.{owner}",
            "status": "eq.connected",
            "token_fingerprint": f"eq.{connection.token_fingerprint}",
            "last_attempted_at": f"eq.{captured_at}",
        }, {"last_error": str(error)[:1000], "updated_at": now_iso()})
        raise


def connections(db: Supabase) -> list[Connection]:
    force = os.getenv("TEMA_SYNC_FORCE", "").strip().casefold() in {"1", "true", "yes"}
    direct_owner, direct_token = os.getenv("UNAB_OS_OWNER_ID"), os.getenv("TEMA_TOKEN")
    if direct_owner and direct_token and force:
        fingerprint = hashlib.sha256(direct_token.encode()).hexdigest()
        matching = db.select("tema_connections", {
            "select": "owner_id",
            "owner_id": f"eq.{direct_owner}",
            "status": "eq.connected",
            "token_fingerprint": f"eq.{fingerprint}",
            "limit": "1",
        })
        if len(matching) != 1:
            raise SyncError("Legacy TEMA token does not match the owner's current connected account.")
        return [Connection(direct_owner, direct_token, fingerprint)]
    encryption_key = os.getenv("TEMA_CREDENTIALS_KEY")
    if not encryption_key:
        raise SyncError("Set TEMA_CREDENTIALS_KEY or the legacy UNAB_OS_OWNER_ID and TEMA_TOKEN.")
    rows = db.select("tema_connections", {
        "select": "owner_id,token_envelope,token_fingerprint,sync_requested_at,last_synced_at,last_attempted_at",
        "status": "eq.connected",
        "order": "sync_requested_at.asc",
    })
    connections_due = []
    for row in rows:
        if not connection_due(row, force=force):
            continue
        token = decrypt_token(row["token_envelope"], encryption_key)
        expected = str(row.get("token_fingerprint") or "")
        actual = hashlib.sha256(token.encode()).hexdigest()
        if not hmac.compare_digest(actual, expected):
            raise SyncError("TEMA token fingerprint mismatch.")
        connections_due.append(Connection(row["owner_id"], token, expected))
    return connections_due


def main() -> None:
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SyncError("Set SUPABASE_URL and SUPABASE_SECRET_KEY.")
    db, results = Supabase(url, key), []
    for connection in connections(db):
        try:
            results.append(sync_connection(db, connection))
        except Exception as error:
            results.append({"ownerId": connection.owner_id, "status": "failed", "error": str(error)[:300]})
    print(json.dumps({"students": results}, ensure_ascii=False))
    if any(result["status"] == "failed" for result in results):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
