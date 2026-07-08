#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import lightgbm as lgb
import pandas as pd
import torch

from dkt_model import DKT
from fraud_detect.config import ARTIFACTS_DIR, NUM_SKILLS, POPULATION_FRAUD_RATE
from fraud_detect.dkt_fraud import (
    build_user_sequences,
    fraud_probabilities,
    pad_sequences,
)
from fraud_detect.features import build_tabular_features
from fraud_detect.load_data import load_test, load_train
from fraud_detect.skills import apply_amount_bins, assign_skills


def load_dkt_model() -> DKT:
    checkpoint = torch.load(ARTIFACTS_DIR / "fraud_dkt.pt", map_location="cpu", weights_only=False)
    model = DKT(checkpoint["num_skills"], checkpoint["hidden_dim"])
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()
    return model


def predict_baseline(test_df: pd.DataFrame) -> pd.Series:
    model = lgb.Booster(model_file=str(ARTIFACTS_DIR / "baseline_lgbm.txt"))
    features, _ = build_tabular_features(test_df)
    x = features.drop(columns=["TransactionID", "user_id"])
    cat_cols = [col for col in x.columns if str(x[col].dtype) == "category"]
    for col in cat_cols:
        x[col] = x[col].cat.codes
    scores = model.predict(x)
    return pd.Series(scores, index=features["TransactionID"])


def predict_dkt(test_df: pd.DataFrame, train_df: pd.DataFrame) -> pd.Series:
    model = load_dkt_model()
    bins = apply_amount_bins(test_df, train_df)
    prepared = assign_skills(test_df, amount_bins=bins)
    prepared = prepared.sort_values(["user_id", "TransactionDT", "TransactionID"])

    scores: dict[int, float] = {}
    for user_id, group in prepared.groupby("user_id", sort=False):
        rows = list(group.itertuples(index=False))
        if len(rows) == 1:
            scores[int(rows[0].TransactionID)] = POPULATION_FRAUD_RATE
            continue

        data = [(int(user_id), int(row.skill_id), 1) for row in rows]
        txn_map = {(int(user_id), idx): int(row.TransactionID) for idx, row in enumerate(rows)}

        _, inputs_list, skills_list, corrects_list, txn_lists = build_user_sequences(
            data, NUM_SKILLS, transaction_ids=txn_map
        )
        batch = pad_sequences(inputs_list, skills_list, corrects_list, txn_lists)
        with torch.no_grad():
            preds = model(batch.inputs)
            fraud = fraud_probabilities(preds, batch.skills)

        for idx, row in enumerate(rows):
            scores[int(row.TransactionID)] = fraud[0, idx].item()

    return pd.Series(scores)


def write_submission(scores: pd.Series, all_transaction_ids: pd.Series, output: Path) -> None:
    submission = pd.DataFrame({"TransactionID": all_transaction_ids})
    submission["isFraud"] = submission["TransactionID"].map(scores)
    submission["isFraud"] = submission["isFraud"].fillna(POPULATION_FRAUD_RATE)
    submission = submission.sort_values("TransactionID")
    output.parent.mkdir(parents=True, exist_ok=True)
    submission.to_csv(output, index=False)
    print(f"Wrote {len(submission)} predictions to {output}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate fraud submission.")
    parser.add_argument("--model", choices=["baseline", "dkt"], required=True)
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output CSV path (default: artifacts/submission_{model}.csv)",
    )
    args = parser.parse_args()

    train_df = load_train()
    test_df = load_test()
    all_txn_ids = pd.read_csv(
        ROOT / "fraud_detect_data" / "ieee-fraud-detection" / "test_transaction.csv",
        usecols=["TransactionID"],
    )["TransactionID"]
    test_df = assign_skills(test_df, amount_bins=apply_amount_bins(test_df, train_df))

    if args.model == "baseline":
        scores = predict_baseline(test_df)
    else:
        scores = predict_dkt(test_df, train_df)

    output = args.output or ARTIFACTS_DIR / f"submission_{args.model}.csv"
    write_submission(scores, all_txn_ids, output)


if __name__ == "__main__":
    main()
