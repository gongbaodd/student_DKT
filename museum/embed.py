#!/usr/bin/env python3
"""Generate text embeddings for museums and save one file per museum id."""

import json
import os
from pathlib import Path

import lmstudio as lms
import pandas as pd
from dotenv import load_dotenv

DIR = Path(__file__).resolve().parent
load_dotenv(DIR / ".env")

INPUT_FILE = DIR / "museums.csv"
OUTPUT_DIR = DIR / "embedding"

DEFAULT_MODEL = "text-embedding-qwen3-embedding-0.6b"


def get_embedding(text: str, model: str | None = None) -> list[float]:
    model_id = model or os.environ.get("EMBEDDING_MODEL", DEFAULT_MODEL)
    normalized = text.replace("\n", " ")
    handle = lms.embedding_model(model_id)
    result = handle.embed(normalized)
    return list(result) if not isinstance(result, list) else result


def build_embedding_text(city: str, name: str) -> str:
    return f"{city}|{name}"


def embed_museums(df: pd.DataFrame, model: str | None = None) -> None:
    """Embed city|name for each museum and write vectors to embedding/{museum_id}."""
    OUTPUT_DIR.mkdir(exist_ok=True)
    total = len(df)

    for index, row in enumerate(df.itertuples(index=False), start=1):
        museum_id = str(row.museum_id)
        output_file = OUTPUT_DIR / museum_id

        if output_file.exists():
            print(f"[{index}/{total}] Skipping {museum_id} (already embedded)")
            continue

        city = "" if pd.isna(row.city) else str(row.city).strip()
        name = "" if pd.isna(row.name) else str(row.name).strip()
        text = build_embedding_text(city, name)

        print(f"[{index}/{total}] Embedding {museum_id}: {text}")
        embedding = get_embedding(text, model=model)
        output_file.write_text(json.dumps(embedding), encoding="utf-8")


def main() -> None:
    df = pd.read_csv(INPUT_FILE, encoding="utf-8-sig")
    embed_museums(df)
    print(f"Saved embeddings to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
