#!/usr/bin/env python3
"""Convert agile_data/deep-se/moodle.csv to done.json + todos.json."""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from agile_train.components import assign_component  # noqa: E402

SRC = ROOT / "agile_data" / "deep-se" / "moodle.csv"
OUT_DIR = Path(__file__).resolve().parents[1] / "public"
DONE_OUT = OUT_DIR / "done.json"
TODOS_OUT = OUT_DIR / "todos.json"
MAX_STORY_POINTS = 50
SPLIT_RATIO = 0.2


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing source CSV: {SRC}")

    issues: list[dict] = []
    skipped = 0
    with SRC.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            sp = row.get("storypoint", "").strip()
            story_points = int(sp) if sp else 0
            if story_points > MAX_STORY_POINTS:
                skipped += 1
                continue
            title = row["title"]
            issues.append(
                {
                    "project": row["project"],
                    "issueKey": row["issuekey"],
                    "title": title,
                    "description": row["description"],
                    "storyPoints": story_points,
                    "component": assign_component(title),
                }
            )

    split_index = int(len(issues) * SPLIT_RATIO)
    todos_raw = issues[:split_index]
    done_raw = issues[split_index:]

    todos = [
        {
            "project": issue["project"],
            "issueKey": issue["issueKey"],
            "title": issue["title"],
            "description": issue["description"],
            "originalStoryPoints": issue["storyPoints"],
            "component": issue["component"],
        }
        for issue in todos_raw
    ]

    done = [
        {
            "project": issue["project"],
            "issueKey": issue["issueKey"],
            "title": issue["title"],
            "description": issue["description"],
            "storyPoints": issue["storyPoints"],
            "component": issue["component"],
        }
        for issue in done_raw
    ]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    DONE_OUT.write_text(json.dumps(done, ensure_ascii=False, indent=2), encoding="utf-8")
    TODOS_OUT.write_text(json.dumps(todos, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        f"Wrote {len(done)} done issues to {DONE_OUT} "
        f"and {len(todos)} todos to {TODOS_OUT} "
        f"(skipped {skipped} with story points > {MAX_STORY_POINTS})"
    )


if __name__ == "__main__":
    main()
