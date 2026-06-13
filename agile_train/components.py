"""Keyword-based component assignment for Moodle issues."""

from __future__ import annotations

COMPONENTS = ["forum", "quiz", "grade", "theme", "general"]

_KEYWORDS: list[tuple[str, list[str]]] = [
    ("forum", ["forum", "discussion", "post", "thread"]),
    ("quiz", ["quiz", "question", "attempt", "assessment"]),
    ("grade", ["grade", "grading", "score", "mark", "boundary"]),
    ("theme", ["theme", "css", "style", "layout", "render", "mustache", "template"]),
]

_COMPONENT_INDEX = {name: index for index, name in enumerate(COMPONENTS)}


def assign_component(title: str) -> int:
    """Return component id for an issue title (lower-cased keyword match)."""
    lower = title.lower()
    for name, keywords in _KEYWORDS:
        if any(kw in lower for kw in keywords):
            return _COMPONENT_INDEX[name]
    return _COMPONENT_INDEX["general"]


def component_name(component_id: int) -> str:
    return COMPONENTS[component_id]
