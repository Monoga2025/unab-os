"""Stable source identity for Moodle files, independent of display order."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any
from urllib.parse import unquote, urlparse


def stable_candidate_id(module_id: Any, item: dict[str, Any]) -> str:
    parsed = urlparse(str(item.get("fileurl") or ""))
    if parsed.scheme != "https" or parsed.netloc != "tema.unab.edu.co" or not parsed.path:
        raise ValueError("Invalid official TEMA file URL.")
    module = re.sub(r"[^A-Za-z0-9_-]", "", str(module_id))[:48] or "module"
    identity = {
        "module": str(module_id),
        "item": str(item.get("itemid") or item.get("id") or ""),
        "filepath": str(item.get("filepath") or ""),
        "filename": str(item.get("filename") or ""),
        # Pluginfile path includes context, component, file area and item id.
        # Query parameters are deliberately excluded so tokens/forcedownload
        # flags cannot change or leak into the identity.
        "pluginfile_path": unquote(parsed.path),
    }
    digest = hashlib.sha256(json.dumps(identity, sort_keys=True, separators=(",", ":")).encode()).hexdigest()[:32]
    return f"moodle-{module}-{digest}"[:128]
