#!/usr/bin/env python3
"""Generate text embeddings for Moodle issues and save one file per issue key."""

from __future__ import annotations

import csv
import json
import os
from pathlib import Path

import lmstudio as lms
from dotenv import load_dotenv

DIR = Path(__file__).resolve().parent
ROOT = DIR.parent
load_dotenv(DIR / ".env")
load_dotenv(ROOT / "museum" / ".env")

ISSUES_FILE = ROOT / "agile_data" / "deep-se" / "moodle.csv"
OUTPUT_DIR = DIR / "embedding"

DEFAULT_MODEL = "text-embedding-qwen3-embedding-0.6b"


def get_embedding(text: str, model: str | None = None) -> list[float]:
    model_id = model or os.environ.get("EMBEDDING_MODEL", DEFAULT_MODEL)
    normalized = text.replace("\n", " ")
    handle = lms.embedding_model(model_id)
    result = handle.embed(normalized)
    return list(result) if not isinstance(result, list) else result


def build_embedding_text(story_point: str, title: str, description: str) -> str:
    return (
        f"storyPoint: {story_point.strip()} | title: {title.strip()} | "
        f"description: {description.strip()}"
    )


def load_issues(path: Path = ISSUES_FILE) -> list[dict[str, str]]:
    if not path.is_file():
        raise FileNotFoundError(f"Missing issues CSV: {path}")

    issues: list[dict[str, str]] = []
    with path.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            issues.append(
                {
                    "issueKey": row["issuekey"].strip(),
                    "storyPoint": row["storypoint"].strip(),
                    "title": row["title"].strip(),
                    "description": row["description"].strip(),
                }
            )
    return issues


def embed_issues(issues: list[dict[str, str]], model: str | None = None) -> None:
    """Embed issue story point, title, and description; write vectors to embedding/{issue_key}."""
    OUTPUT_DIR.mkdir(exist_ok=True)
    total = len(issues)

    for index, issue in enumerate(issues, start=1):
        issue_key = issue["issueKey"]
        output_file = OUTPUT_DIR / issue_key

        if output_file.exists():
            print(f"[{index}/{total}] Skipping {issue_key} (already embedded)")
            continue

        text = build_embedding_text(
            issue["storyPoint"], issue["title"], issue["description"]
        )
        print(f"[{index}/{total}] Embedding {issue_key}: {text[:80]}")
        embedding = get_embedding(text, model=model)
        output_file.write_text(json.dumps(embedding), encoding="utf-8")


def main() -> None:
    issues = load_issues()
    embed_issues(issues)
    print(f"Saved embeddings to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
