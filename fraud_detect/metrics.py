from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from sklearn.metrics import average_precision_score, roc_auc_score


def compute_metrics(y_true: list[int] | np.ndarray, y_score: list[float] | np.ndarray) -> dict[str, float]:
    y_true_arr = np.asarray(y_true, dtype=int)
    y_score_arr = np.asarray(y_score, dtype=float)
    if len(np.unique(y_true_arr)) < 2:
        return {"roc_auc": float("nan"), "pr_auc": float("nan"), "recall_at_1pct_fpr": float("nan")}

    roc = roc_auc_score(y_true_arr, y_score_arr)
    pr = average_precision_score(y_true_arr, y_score_arr)

    thresholds = np.sort(y_score_arr)
    cutoff_idx = max(0, int(len(thresholds) * 0.99) - 1)
    cutoff = thresholds[cutoff_idx]
    preds = y_score_arr >= cutoff
    negatives = y_true_arr == 0
    positives = y_true_arr == 1
    fpr = (preds & negatives).sum() / max(negatives.sum(), 1)
    recall = (preds & positives).sum() / max(positives.sum(), 1)
    recall_at_1pct = recall if fpr <= 0.01 else float("nan")

    return {
        "roc_auc": float(roc),
        "pr_auc": float(pr),
        "recall_at_1pct_fpr": float(recall_at_1pct),
    }


def save_metrics(metrics: dict[str, float], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(metrics, indent=2))


def print_metrics(name: str, metrics: dict[str, float]) -> None:
    print(f"{name:12s}  ROC-AUC={metrics['roc_auc']:.4f}  PR-AUC={metrics['pr_auc']:.4f}  "
          f"Recall@1%FPR={metrics['recall_at_1pct_fpr']:.4f}")
