#!/usr/bin/env python3
"""Join museum CSVs and emit JSON for museum_web/public/."""

from __future__ import annotations

import csv
import json
from pathlib import Path

MUSEUM_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = MUSEUM_DIR.parent / "museum_web" / "public"

CLUSTERS_NAMED = MUSEUM_DIR / "clusters_named.csv"
MUSEUMS = MUSEUM_DIR / "museums.csv"
CLUSTER_NAMES = MUSEUM_DIR / "cluster_names.csv"


def load_museums_by_id() -> dict[str, dict[str, str]]:
    by_id: dict[str, dict[str, str]] = {}
    with MUSEUMS.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            by_id[row["museum_id"]] = row
    return by_id


def build_museums() -> list[dict[str, object]]:
    museums_by_id = load_museums_by_id()
    museums: list[dict[str, object]] = []

    with CLUSTERS_NAMED.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            museum_id = row["museum_id"]
            extra = museums_by_id.get(museum_id, {})
            museums.append(
                {
                    "museumId": int(museum_id),
                    "name": row["name"],
                    "city": row["city"],
                    "clusterId": int(row["cluster"]),
                    "clusterName": row["cluster_name"],
                    "imageUrl": extra.get("image_url", ""),
                    "url": extra.get("url", ""),
                    "location": extra.get("location", ""),
                }
            )

    museums.sort(key=lambda m: m["museumId"])
    return museums


def build_skills() -> list[dict[str, object]]:
    skills: list[dict[str, object]] = []
    with CLUSTER_NAMES.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            skills.append(
                {
                    "clusterId": int(row["cluster"]),
                    "clusterName": row["cluster_name"],
                    "museumCount": int(row["museum_count"]),
                }
            )
    skills.sort(key=lambda s: s["clusterId"])
    return skills


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    museums = build_museums()
    skills = build_skills()

    museums_path = OUTPUT_DIR / "museums.json"
    skills_path = OUTPUT_DIR / "skills.json"

    museums_path.write_text(json.dumps(museums, indent=2, ensure_ascii=False) + "\n")
    skills_path.write_text(json.dumps(skills, indent=2, ensure_ascii=False) + "\n")

    print(f"Wrote {len(museums)} museums to {museums_path}")
    print(f"Wrote {len(skills)} skills to {skills_path}")


if __name__ == "__main__":
    main()
