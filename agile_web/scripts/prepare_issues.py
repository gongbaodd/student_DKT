#!/usr/bin/env python3
"""Convert agile_data/deep-se/moodle.csv to agile_web/public/issues.json."""

from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "agile_data" / "deep-se" / "moodle.csv"
OUT = Path(__file__).resolve().parents[1] / "public" / "issues.json"


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing source CSV: {SRC}")

    issues: list[dict] = []
    with SRC.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            sp = row.get("storypoint", "").strip()
            issues.append(
                {
                    "project": row["project"],
                    "issueKey": row["issuekey"],
                    "title": row["title"],
                    "description": row["description"],
                    "storyPoints": int(sp) if sp else 0,
                }
            )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(issues, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(issues)} issues to {OUT}")


if __name__ == "__main__":
    main()
