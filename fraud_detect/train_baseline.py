#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold

from fraud_detect.config import ARTIFACTS_DIR, SEED, VAL_FOLDS
from fraud_detect.features import build_tabular_features
from fraud_detect.load_data import load_train
from fraud_detect.metrics import compute_metrics, print_metrics, save_metrics


def prepare_matrix(features: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    x = features.drop(columns=["TransactionID"])
    cat_cols = [col for col in x.columns if str(x[col].dtype) == "category"]
    for col in cat_cols:
        x[col] = x[col].cat.codes
    x = x.drop(columns=["user_id"])
    return x, list(x.columns)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train LightGBM fraud baseline.")
    parser.add_argument("--full-v", action="store_true", help="Use all V features.")
    parser.add_argument("--folds", type=int, default=VAL_FOLDS)
    args = parser.parse_args()

    df = load_train()
    features, labels = build_tabular_features(df, full_v=args.full_v)
    assert labels is not None

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    x, feature_names = prepare_matrix(features)
    y = labels.to_numpy()
    groups = features["user_id"].to_numpy()

    pos = (y == 1).sum()
    neg = (y == 0).sum()
    scale_pos_weight = neg / max(pos, 1)

    gkf = GroupKFold(n_splits=args.folds)
    oof = np.zeros(len(y), dtype=float)
    fold_metrics: list[dict[str, float]] = []

    params = {
        "objective": "binary",
        "metric": "auc",
        "learning_rate": 0.05,
        "num_leaves": 64,
        "feature_fraction": 0.8,
        "bagging_fraction": 0.8,
        "bagging_freq": 1,
        "scale_pos_weight": scale_pos_weight,
        "verbose": -1,
        "seed": SEED,
    }

    print(f"Rows: {len(y)}, fraud rate: {y.mean():.3%}, scale_pos_weight={scale_pos_weight:.1f}")

    for fold, (train_idx, val_idx) in enumerate(gkf.split(x, y, groups)):
        train_set = lgb.Dataset(x.iloc[train_idx], label=y[train_idx])
        val_set = lgb.Dataset(x.iloc[val_idx], label=y[val_idx])
        model = lgb.train(
            params,
            train_set,
            num_boost_round=500,
            valid_sets=[val_set],
            callbacks=[lgb.early_stopping(50, verbose=False)],
        )
        preds = model.predict(x.iloc[val_idx])
        oof[val_idx] = preds
        metrics = compute_metrics(y[val_idx], preds)
        fold_metrics.append(metrics)
        print_metrics(f"Fold {fold + 1}", metrics)

    overall = compute_metrics(y, oof)
    print_metrics("Overall", overall)

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    final_train = lgb.Dataset(x, label=y)
    final_model = lgb.train(params, final_train, num_boost_round=300)
    model_path = ARTIFACTS_DIR / "baseline_lgbm.txt"
    final_model.save_model(str(model_path))

    save_metrics(
        {
            "overall": overall,
            "folds": fold_metrics,
            "feature_names": feature_names,
        },
        ARTIFACTS_DIR / "baseline_metrics.json",
    )
    print(f"Saved model to {model_path}")


if __name__ == "__main__":
    main()
