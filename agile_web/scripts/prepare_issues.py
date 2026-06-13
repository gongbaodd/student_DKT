#!/usr/bin/env python3
"""Convert agile_data/deep-se/moodle.csv to agile_web/public/issues.json."""

from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "agile_data" / "deep-se" / "moodle.csv"
OUT = Path(__file__).resolve().parents[1] / "public" / "issues.json"
MAX_STORY_POINTS = 50


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
            issues.append(
                {
                    "project": row["project"],
                    "issueKey": row["issuekey"],
                    "title": row["title"],
                    "description": row["description"],
                    "storyPoints": story_points,
                }
            )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(issues, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"Wrote {len(issues)} issues to {OUT} "
        f"(skipped {skipped} with story points > {MAX_STORY_POINTS})"
    )


if __name__ == "__main__":
    main()
