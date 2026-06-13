#!/usr/bin/env python3
"""Cluster issue embeddings with K-means."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans

DIR = Path(__file__).resolve().parent
ROOT = DIR.parent
EMBEDDING_DIR = DIR / "embedding"
ISSUES_FILE = ROOT / "agile_data" / "deep-se" / "moodle.csv"
CLUSTERS_FILE = DIR / "clusters.csv"
CENTROIDS_FILE = DIR / "centroids.json"


def load_embeddings(embedding_dir: Path) -> tuple[list[str], np.ndarray]:
    """Load all embedding files and return issue keys with a 2D vector matrix."""
    embedding_files = sorted(path for path in embedding_dir.iterdir() if path.is_file())
    if not embedding_files:
        raise FileNotFoundError(f"No embedding files found in {embedding_dir}")

    issue_keys: list[str] = []
    vectors: list[list[float]] = []

    for path in embedding_files:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, list) or not data:
            raise ValueError(f"Invalid embedding in {path}")

        issue_keys.append(path.name)
        vectors.append(data)

    matrix = np.asarray(vectors, dtype=np.float64)
    if matrix.ndim != 2:
        raise ValueError(f"Expected 2D embedding matrix, got shape {matrix.shape}")

    return issue_keys, matrix


DEFAULT_CLUSTERS = 20


def default_cluster_count(_sample_count: int) -> int:
    return DEFAULT_CLUSTERS


def cluster_embeddings(
    matrix: np.ndarray,
    n_clusters: int,
    random_state: int = 42,
) -> tuple[np.ndarray, np.ndarray, float]:
    """Run K-means and return labels, centroids, and inertia."""
    model = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=10)
    labels = model.fit_predict(matrix)
    return labels, model.cluster_centers_, float(model.inertia_)


def load_issues(path: Path) -> pd.DataFrame:
    issues = pd.read_csv(path, encoding="utf-8-sig", dtype={"issuekey": str})
    issues = issues.rename(columns={"issuekey": "issueKey"})
    issues["issueKey"] = issues["issueKey"].str.strip()
    issues["title"] = issues["title"].astype(str).str.strip()
    return issues[["issueKey", "title"]]


def build_cluster_dataframe(
    issue_keys: list[str],
    labels: np.ndarray,
    issues_file: Path,
) -> pd.DataFrame:
    result = pd.DataFrame({"issueKey": issue_keys, "cluster": labels})

    if issues_file.exists():
        issues = load_issues(issues_file)
        result = result.merge(issues, on="issueKey", how="left")

    return result.sort_values(["cluster", "issueKey"]).reset_index(drop=True)


def save_centroids(centroids: np.ndarray, path: Path) -> None:
    payload = {
        "centroids": centroids.tolist(),
        "num_clusters": int(centroids.shape[0]),
        "embedding_dim": int(centroids.shape[1]),
    }
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def print_cluster_summary(df: pd.DataFrame, sample_size: int = 5) -> None:
    for cluster_id, group in df.groupby("cluster", sort=True):
        print(f"\nCluster {cluster_id} ({len(group)} issues)")
        for row in group.head(sample_size).itertuples(index=False):
            title = "" if pd.isna(row.title) else str(row.title)
            print(f"  {row.issueKey}: {title[:100]}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Cluster issue embeddings with K-means")
    parser.add_argument(
        "-k",
        "--clusters",
        type=int,
        default=None,
        help=f"Number of clusters (default: {DEFAULT_CLUSTERS})",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=42,
        help="Random seed for K-means",
    )
    args = parser.parse_args()

    issue_keys, matrix = load_embeddings(EMBEDDING_DIR)
    n_clusters = args.clusters or default_cluster_count(len(issue_keys))
    if n_clusters < 2:
        raise ValueError("Number of clusters must be at least 2")
    if n_clusters > len(issue_keys):
        raise ValueError(
            f"Cannot create {n_clusters} clusters from {len(issue_keys)} embeddings"
        )

    labels, centroids, inertia = cluster_embeddings(
        matrix,
        n_clusters=n_clusters,
        random_state=args.random_state,
    )
    result = build_cluster_dataframe(issue_keys, labels, ISSUES_FILE)
    result.to_csv(CLUSTERS_FILE, index=False, encoding="utf-8")
    save_centroids(centroids, CENTROIDS_FILE)

    print(f"Clustered {len(issue_keys)} embeddings into {n_clusters} groups")
    print(f"Inertia: {inertia:.4f}")
    print(f"Saved assignments to {CLUSTERS_FILE}")
    print(f"Saved centroids to {CENTROIDS_FILE}")
    print_cluster_summary(result)


if __name__ == "__main__":
    main()
