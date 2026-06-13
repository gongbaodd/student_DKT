"""Load agile_web issue JSON for training and export."""

from __future__ import annotations

import json
from pathlib import Path

from agile_train.irt_model import Ticket

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DONE = ROOT / "agile_web" / "public" / "done.json"
DEFAULT_TODOS = ROOT / "agile_web" / "public" / "todos.json"


def load_issues(
    done_path: Path = DEFAULT_DONE,
    todos_path: Path = DEFAULT_TODOS,
) -> tuple[list[dict], list[dict]]:
    if not done_path.is_file():
        raise FileNotFoundError(f"Missing {done_path}; run agile_web/scripts/prepare_issues.py")
    if not todos_path.is_file():
        raise FileNotFoundError(f"Missing {todos_path}; run agile_web/scripts/prepare_issues.py")

    done = json.loads(done_path.read_text(encoding="utf-8"))
    todos = json.loads(todos_path.read_text(encoding="utf-8"))
    return done, todos


def build_tickets(done: list[dict], todos: list[dict]) -> dict[str, Ticket]:
    tickets: dict[str, Ticket] = {}
    for issue in done + todos:
        tickets[issue["issueKey"]] = Ticket(component=issue["component"])
    return tickets


def build_team_seq(done: list[dict]) -> list[tuple[str, float]]:
    return [(issue["issueKey"], float(issue["storyPoints"])) for issue in done]
