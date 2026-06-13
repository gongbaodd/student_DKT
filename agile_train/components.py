"""Embedding-cluster assignment for Moodle issues."""

from __future__ import annotations

import csv
import json
import os
from functools import lru_cache
from pathlib import Path

import numpy as np

DIR = Path(__file__).resolve().parent
CLUSTERS_FILE = DIR / "clusters.csv"
CLUSTER_NAMES_FILE = DIR / "cluster_names.csv"
CENTROIDS_FILE = DIR / "centroids.json"


def _default_cluster_name(cluster_id: int) -> str:
    return f"cluster-{cluster_id}"


@lru_cache(maxsize=1)
def _load_cluster_names() -> dict[int, str]:
    if not CLUSTER_NAMES_FILE.is_file():
        return {}

    names: dict[int, str] = {}
    with CLUSTER_NAMES_FILE.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            names[int(row["cluster"])] = row["cluster_name"].strip()
    return names


@lru_cache(maxsize=1)
def _load_issue_clusters() -> dict[str, int]:
    if not CLUSTERS_FILE.is_file():
        raise FileNotFoundError(
            f"Missing {CLUSTERS_FILE}. "
            "Run: PYTHONPATH=. python agile_train/embed.py && "
            "PYTHONPATH=. python agile_train/cluster.py"
        )

    mapping: dict[str, int] = {}
    with CLUSTERS_FILE.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            mapping[row["issueKey"]] = int(row["cluster"])
    return mapping


@lru_cache(maxsize=1)
def _load_centroids() -> np.ndarray:
    if not CENTROIDS_FILE.is_file():
        raise FileNotFoundError(
            f"Missing {CENTROIDS_FILE}. "
            "Run: PYTHONPATH=. python agile_train/cluster.py"
        )

    payload = json.loads(CENTROIDS_FILE.read_text(encoding="utf-8"))
    centroids = np.asarray(payload["centroids"], dtype=np.float64)
    if centroids.ndim != 2:
        raise ValueError(f"Expected 2D centroids, got shape {centroids.shape}")
    return centroids


def _cluster_name_list() -> list[str]:
    cluster_names = _load_cluster_names()
    if not cluster_names:
        return []

    max_cluster = max(cluster_names)
    return [
        cluster_names.get(cluster_id, _default_cluster_name(cluster_id))
        for cluster_id in range(max_cluster + 1)
    ]


def _refresh_clusters() -> None:
    _load_cluster_names.cache_clear()
    _load_issue_clusters.cache_clear()
    _load_centroids.cache_clear()
    CLUSTER_NAMES.clear()
    CLUSTER_NAMES.extend(_cluster_name_list())


@lru_cache(maxsize=256)
def _get_embedding(text: str) -> tuple[float, ...]:
    import lmstudio as lms

    model_id = os.environ.get("EMBEDDING_MODEL", "text-embedding-qwen3-embedding-0.6b")
    normalized = text.replace("\n", " ")
    handle = lms.embedding_model(model_id)
    result = handle.embed(normalized)
    vector = list(result) if not isinstance(result, list) else result
    return tuple(vector)


def _nearest_cluster(embedding: np.ndarray) -> int:
    centroids = _load_centroids()
    distances = np.linalg.norm(centroids - embedding, axis=1)
    return int(distances.argmin())


CLUSTER_NAMES: list[str] = []


def cluster_name(cluster_id: int) -> str:
    cluster_names = _load_cluster_names()
    if cluster_id in cluster_names:
        return cluster_names[cluster_id]
    return _default_cluster_name(cluster_id)


def assign_cluster_for_issue(issue_key: str, title: str) -> int:
    """Return cluster id for an issue, using saved assignments when available."""
    issue_clusters = _load_issue_clusters()
    if issue_key in issue_clusters:
        return issue_clusters[issue_key]

    embedding = np.asarray(_get_embedding(title), dtype=np.float64)
    return _nearest_cluster(embedding)


def assign_cluster(title: str) -> int:
    """Return cluster id for an issue title via nearest centroid."""
    embedding = np.asarray(_get_embedding(title), dtype=np.float64)
    return _nearest_cluster(embedding)


try:
    _refresh_clusters()
except FileNotFoundError:
    pass
