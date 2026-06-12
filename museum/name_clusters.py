#!/usr/bin/env python3
"""Name museum clusters using an LM Studio chat model."""

import argparse
import html
import os
import re
from pathlib import Path

import lmstudio as lms
import pandas as pd
from dotenv import load_dotenv

DIR = Path(__file__).resolve().parent
load_dotenv(DIR / ".env")

CLUSTERS_FILE = DIR / "clusters.csv"
OUTPUT_FILE = DIR / "cluster_names.csv"
NAMED_CLUSTERS_FILE = DIR / "clusters_named.csv"

DEFAULT_MODEL = "google/gemma-4-e4b"

SYSTEM_PROMPT = (
    "You label groups of Estonian museums. "
    "Given a list of museums in one cluster, reply with a short descriptive name "
    "(2-5 words) that captures their shared theme, location, or type. "
    "Reply with only the cluster name, no quotes, punctuation, or explanation."
)


def clean_text(value: object) -> str:
    if pd.isna(value):
        return ""
    return html.unescape(str(value).strip())


def build_cluster_prompt(group: pd.DataFrame) -> str:
    lines = [
        "Name this cluster of Estonian museums:",
        "",
    ]
    for row in group.itertuples(index=False):
        city = clean_text(row.city)
        name = clean_text(row.name)
        if city:
            lines.append(f"- {city} | {name}")
        else:
            lines.append(f"- {name}")
    return "\n".join(lines)


def extract_response_text(response: object) -> str:
    if hasattr(response, "content"):
        return str(response.content).strip()
    return str(response).strip()


def normalize_cluster_name(name: str) -> str:
    cleaned = name.strip().strip("\"'")
    cleaned = cleaned.split("\n", maxsplit=1)[0].strip()
    cleaned = re.sub(r"^(cluster name|name)\s*:\s*", "", cleaned, flags=re.IGNORECASE)
    return cleaned


def name_cluster(model: lms.LLM, group: pd.DataFrame) -> str:
    chat = lms.Chat(SYSTEM_PROMPT)
    chat.add_user_message(build_cluster_prompt(group))
    response = model.respond(
        chat,
        config={
            "temperature": 0.3,
            "maxTokens": 128,
        },
    )
    return normalize_cluster_name(extract_response_text(response))


def load_clusters(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, encoding="utf-8-sig", dtype={"museum_id": str})
    required = {"museum_id", "cluster", "name"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns in {path}: {', '.join(sorted(missing))}")
    return df


def name_all_clusters(
    df: pd.DataFrame,
    model_id: str,
) -> pd.DataFrame:
    model = lms.llm(model_id)
    rows: list[dict[str, object]] = []

    for cluster_id, group in df.groupby("cluster", sort=True):
        cluster_name = name_cluster(model, group)
        rows.append(
            {
                "cluster": cluster_id,
                "cluster_name": cluster_name,
                "museum_count": len(group),
            }
        )
        print(f"Cluster {cluster_id} ({len(group)} museums): {cluster_name}")

    return pd.DataFrame(rows).sort_values("cluster").reset_index(drop=True)


def merge_cluster_names(df: pd.DataFrame, names: pd.DataFrame) -> pd.DataFrame:
    return df.merge(names[["cluster", "cluster_name"]], on="cluster", how="left")


def main() -> None:
    parser = argparse.ArgumentParser(description="Name museum clusters with LM Studio")
    parser.add_argument(
        "--input",
        type=Path,
        default=CLUSTERS_FILE,
        help="Input clusters CSV (default: clusters.csv)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_FILE,
        help="Output cluster names CSV (default: cluster_names.csv)",
    )
    parser.add_argument(
        "--named-clusters",
        type=Path,
        default=NAMED_CLUSTERS_FILE,
        help="Output clusters CSV with cluster_name column (default: clusters_named.csv)",
    )
    parser.add_argument(
        "--model",
        default=os.environ.get("LLM_MODEL", DEFAULT_MODEL),
        help=f"LM Studio model id (default: {DEFAULT_MODEL})",
    )
    args = parser.parse_args()

    df = load_clusters(args.input)
    names = name_all_clusters(df, model_id=args.model)

    names.to_csv(args.output, index=False, encoding="utf-8")
    merge_cluster_names(df, names).to_csv(
        args.named_clusters,
        index=False,
        encoding="utf-8",
    )

    print(f"Saved cluster names to {args.output}")
    print(f"Saved named clusters to {args.named_clusters}")


if __name__ == "__main__":
    main()
