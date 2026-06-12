#!/usr/bin/env python3
"""Cluster museum embeddings with K-means."""

import argparse
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans

DIR = Path(__file__).resolve().parent
EMBEDDING_DIR = DIR / "embedding"
MUSEUMS_FILE = DIR / "museums.csv"
OUTPUT_FILE = DIR / "clusters.csv"


def load_embeddings(embedding_dir: Path) -> tuple[list[str], np.ndarray]:
    """Load all embedding files and return museum ids with a 2D vector matrix."""
    embedding_files = sorted(
        path for path in embedding_dir.iterdir() if path.is_file()
    )
    if not embedding_files:
        raise FileNotFoundError(f"No embedding files found in {embedding_dir}")

    museum_ids: list[str] = []
    vectors: list[list[float]] = []

    for path in embedding_files:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, list) or not data:
            raise ValueError(f"Invalid embedding in {path}")

        museum_ids.append(path.name)
        vectors.append(data)

    matrix = np.asarray(vectors, dtype=np.float64)
    if matrix.ndim != 2:
        raise ValueError(f"Expected 2D embedding matrix, got shape {matrix.shape}")

    return museum_ids, matrix


def default_cluster_count(sample_count: int) -> int:
    return max(2, int(math.sqrt(sample_count)))


def cluster_embeddings(
    matrix: np.ndarray,
    n_clusters: int,
    random_state: int = 42,
) -> tuple[np.ndarray, float]:
    """Run K-means and return cluster labels and inertia."""
    model = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=10)
    labels = model.fit_predict(matrix)
    return labels, float(model.inertia_)


def build_cluster_dataframe(
    museum_ids: list[str],
    labels: np.ndarray,
    museums_file: Path,
) -> pd.DataFrame:
    result = pd.DataFrame({"museum_id": museum_ids, "cluster": labels})

    if museums_file.exists():
        museums = pd.read_csv(museums_file, encoding="utf-8-sig", dtype={"museum_id": str})
        museums["museum_id"] = museums["museum_id"].astype(str)
        result = result.merge(
            museums[["museum_id", "name", "city"]],
            on="museum_id",
            how="left",
        )

    return result.sort_values(["cluster", "museum_id"]).reset_index(drop=True)


def print_cluster_summary(df: pd.DataFrame) -> None:
    for cluster_id, group in df.groupby("cluster", sort=True):
        print(f"\nCluster {cluster_id} ({len(group)} museums)")
        for row in group.itertuples(index=False):
            name = "" if pd.isna(row.name) else str(row.name)
            city = "" if pd.isna(row.city) else str(row.city)
            print(f"  {row.museum_id}: {city} | {name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Cluster museum embeddings with K-means")
    parser.add_argument(
        "-k",
        "--clusters",
        type=int,
        default=None,
        help="Number of clusters (default: sqrt of sample count)",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=42,
        help="Random seed for K-means",
    )
    args = parser.parse_args()

    museum_ids, matrix = load_embeddings(EMBEDDING_DIR)
    n_clusters = args.clusters or default_cluster_count(len(museum_ids))
    if n_clusters < 2:
        raise ValueError("Number of clusters must be at least 2")
    if n_clusters > len(museum_ids):
        raise ValueError(
            f"Cannot create {n_clusters} clusters from {len(museum_ids)} embeddings"
        )

    labels, inertia = cluster_embeddings(
        matrix,
        n_clusters=n_clusters,
        random_state=args.random_state,
    )
    result = build_cluster_dataframe(museum_ids, labels, MUSEUMS_FILE)
    result.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")

    print(f"Clustered {len(museum_ids)} embeddings into {n_clusters} groups")
    print(f"Inertia: {inertia:.4f}")
    print(f"Saved assignments to {OUTPUT_FILE}")
    print_cluster_summary(result)


if __name__ == "__main__":
    main()
