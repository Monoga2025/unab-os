"""Completeness map controlling which absent source rows may be retired."""

from __future__ import annotations


def completeness_map(
    *,
    core_complete: bool,
    files_complete: bool,
    grades_complete: bool,
    announcements_complete: bool,
) -> dict[str, bool]:
    return {
        "courses": True,
        "sections": core_complete,
        "activities": core_complete,
        "files": core_complete and files_complete,
        "grades": grades_complete,
        "announcements": core_complete and announcements_complete,
    }
