#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import numpy as np
import torch
from sklearn.model_selection import GroupKFold

from dkt_model import DKT
from fraud_detect.config import ARTIFACTS_DIR, BATCH_SIZE, NUM_SKILLS, VAL_FOLDS
from fraud_detect.dkt_fraud import build_user_sequences, collect_predictions
from fraud_detect.load_data import load_train
from fraud_detect.metrics import print_metrics
from fraud_detect.sequences import build_sequence_steps, steps_to_dkt_data
from fraud_detect.skills import assign_skills


def load_dkt_model() -> DKT:
    checkpoint = torch.load(ARTIFACTS_DIR / "fraud_dkt.pt", map_location="cpu", weights_only=False)
    model = DKT(checkpoint["num_skills"], checkpoint["hidden_dim"])
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()
    return model


def evaluate_dkt(df, *, fold: int, folds: int) -> dict[str, float]:
    prepared = assign_skills(df)
    steps = build_sequence_steps(prepared)
    dkt_data = steps_to_dkt_data(steps)

    txn_map: dict[tuple[int, int], int] = {}
    by_user: dict[int, list] = {}
    for step in steps:
        by_user.setdefault(step.user_id, []).append(step)
    for user_id, user_steps in by_user.items():
        for idx, step in enumerate(user_steps):
            txn_map[(user_id, idx)] = step.transaction_id

    user_ids, inputs_list, skills_list, corrects_list, txn_lists = build_user_sequences(
        dkt_data, NUM_SKILLS, transaction_ids=txn_map
    )

    unique_users = np.array(user_ids)
    gkf = GroupKFold(n_splits=folds)
    splits = list(gkf.split(unique_users, groups=unique_users))
    _, val_idx = splits[fold]

    val_inputs = [inputs_list[i] for i in val_idx]
    val_skills = [skills_list[i] for i in val_idx]
    val_corrects = [corrects_list[i] for i in val_idx]
    val_txns = [txn_lists[i] for i in val_idx] if txn_lists else None

    model = load_dkt_model()
    probs, labels, _ = collect_predictions(
        model, val_inputs, val_skills, val_corrects, BATCH_SIZE, val_txns
    )
    from fraud_detect.metrics import compute_metrics

    return compute_metrics(labels, probs)


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate fraud models.")
    parser.add_argument("--fold", type=int, default=0)
    parser.add_argument("--folds", type=int, default=VAL_FOLDS)
    args = parser.parse_args()

    print("Evaluating saved models...\n")

    baseline_path = ARTIFACTS_DIR / "baseline_metrics.json"
    if baseline_path.exists():
        payload = json.loads(baseline_path.read_text())
        print_metrics("LightGBM", payload["overall"])
    elif (ARTIFACTS_DIR / "baseline_lgbm.txt").exists():
        print("LightGBM metrics file missing — re-run train_baseline.py.")
    else:
        print("LightGBM model not found — run train_baseline.py first.")

    if (ARTIFACTS_DIR / "fraud_dkt.pt").exists():
        df = load_train()
        dkt_metrics = evaluate_dkt(df, fold=args.fold, folds=args.folds)
        print_metrics("FraudDKT", dkt_metrics)
    else:
        print("FraudDKT checkpoint not found — run train_dkt.py first.")


if __name__ == "__main__":
    main()
