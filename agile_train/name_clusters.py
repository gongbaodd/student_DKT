#!/usr/bin/env python3
"""Name issue clusters using an LM Studio chat model."""

from __future__ import annotations

import argparse
import html
import json
import os
import re
from pathlib import Path

import lmstudio as lms
import numpy as np
import pandas as pd
from dotenv import load_dotenv

DIR = Path(__file__).resolve().parent
load_dotenv(DIR / ".env")
load_dotenv(DIR.parent / "museum" / ".env")

CLUSTERS_FILE = DIR / "clusters.csv"
OUTPUT_FILE = DIR / "cluster_names.csv"
EMBEDDING_DIR = DIR / "embedding"
CENTROIDS_FILE = DIR / "centroids.json"

DEFAULT_MODEL = "google/gemma-4-e4b"
TOP_ISSUES_PER_CLUSTER = 30

SYSTEM_PROMPT = (
    "You label groups of Moodle software issues. "
    "Given a list of issue titles in one cluster, reply with a short descriptive name "
    "(2-5 words) that captures their shared product area or technical theme. "
    "Reply with only the cluster name, no quotes, punctuation, or explanation."
)


def clean_text(value: object) -> str:
    if pd.isna(value):
        return ""
    return html.unescape(str(value).strip())


def build_cluster_prompt(group: pd.DataFrame) -> str:
    lines = [
        "Name this cluster of Moodle issues:",
        "",
    ]
    for row in group.itertuples(index=False):
        lines.append(f"- {clean_text(row.title)}")
    return "\n".join(lines)


def extract_response_text(response: object) -> str:
    if hasattr(response, "content"):
        return str(response.content).strip()
    return str(response).strip()


def normalize_cluster_name(name: str, cluster_id: int | None = None) -> str:
    cleaned = name.strip().strip("\"'")
    cleaned = cleaned.split("\n", maxsplit=1)[0].strip()
    cleaned = re.sub(r"^(cluster name|name)\s*:\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"<\|[^>]+>", "", cleaned).strip()
    if not cleaned or len(cleaned) < 2:
        return f"cluster-{cluster_id}" if cluster_id is not None else "cluster"
    return cleaned


def name_cluster(model: lms.LLM, group: pd.DataFrame) -> str:
    chat = lms.Chat(SYSTEM_PROMPT)
    chat.add_user_message(build_cluster_prompt(group))
    response = model.respond(
        chat,
        config={
            "temperature": 0.3,
            "maxTokens": 4096,
        },
    )
    return normalize_cluster_name(extract_response_text(response), cluster_id=int(group["cluster"].iloc[0]))


def load_clusters(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, encoding="utf-8-sig", dtype={"issueKey": str})
    required = {"issueKey", "cluster", "title"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns in {path}: {', '.join(sorted(missing))}")
    return df


def load_centroids(path: Path) -> np.ndarray:
    if not path.is_file():
        raise FileNotFoundError(f"Missing centroids file: {path}")

    payload = json.loads(path.read_text(encoding="utf-8"))
    return np.asarray(payload["centroids"], dtype=np.float64)


def load_issue_embedding(issue_key: str) -> np.ndarray:
    path = EMBEDDING_DIR / issue_key
    if not path.is_file():
        raise FileNotFoundError(f"Missing embedding for {issue_key}: {path}")

    return np.asarray(json.loads(path.read_text(encoding="utf-8")), dtype=np.float64)


def top_cluster_issues(
    group: pd.DataFrame,
    centroid: np.ndarray,
    limit: int = TOP_ISSUES_PER_CLUSTER,
) -> pd.DataFrame:
    if len(group) <= limit:
        return group

    issue_keys = group["issueKey"].tolist()
    vectors = np.stack([load_issue_embedding(issue_key) for issue_key in issue_keys])
    distances = np.linalg.norm(vectors - centroid, axis=1)
    top_indices = np.argsort(distances)[:limit]
    return group.iloc[top_indices].reset_index(drop=True)


def name_all_clusters(
    df: pd.DataFrame,
    model_id: str,
    centroids: np.ndarray,
    top_n: int = TOP_ISSUES_PER_CLUSTER,
) -> pd.DataFrame:
    model = lms.llm(model_id)
    rows: list[dict[str, object]] = []

    for cluster_id, group in df.groupby("cluster", sort=True):
        sample = top_cluster_issues(group, centroids[int(cluster_id)], limit=top_n)
        cluster_name = name_cluster(model, sample)
        rows.append(
            {
                "cluster": cluster_id,
                "cluster_name": cluster_name,
                "issue_count": len(group),
            }
        )
        print(
            f"Cluster {cluster_id} ({len(group)} issues, top {len(sample)} for naming): "
            f"{cluster_name}"
        )

    return pd.DataFrame(rows).sort_values("cluster").reset_index(drop=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Name issue clusters with LM Studio")
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
        "--model",
        default=os.environ.get("LLM_MODEL", DEFAULT_MODEL),
        help=f"LM Studio model id (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=TOP_ISSUES_PER_CLUSTER,
        help=f"Issues closest to centroid to send per cluster (default: {TOP_ISSUES_PER_CLUSTER})",
    )
    args = parser.parse_args()

    df = load_clusters(args.input)
    centroids = load_centroids(CENTROIDS_FILE)
    names = name_all_clusters(df, model_id=args.model, centroids=centroids, top_n=args.top)
    names.to_csv(args.output, index=False, encoding="utf-8")

    print(f"Saved cluster names to {args.output}")


if __name__ == "__main__":
    main()
