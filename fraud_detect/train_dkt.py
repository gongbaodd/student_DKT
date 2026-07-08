#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import numpy as np
import torch
from sklearn.model_selection import GroupKFold

from dkt_model import DKT
from fraud_detect.config import (
    ARTIFACTS_DIR,
    BATCH_SIZE,
    EPOCHS,
    HIDDEN_DIM,
    LR,
    NUM_SKILLS,
    SEED,
    VAL_FOLDS,
)
from fraud_detect.dkt_fraud import (
    build_user_sequences,
    collect_predictions,
    masked_dkt_loss,
    pad_sequences,
)
from fraud_detect.load_data import load_train
from fraud_detect.metrics import compute_metrics, print_metrics, save_metrics
from fraud_detect.sequences import build_sequence_steps, sequence_stats, steps_to_dkt_data
from fraud_detect.skills import assign_skills, save_skill_map


def split_users(
    user_ids: list[int],
    *,
    folds: int,
    fold_index: int,
) -> tuple[set[int], set[int]]:
    unique_users = np.array(user_ids)
    gkf = GroupKFold(n_splits=folds)
    splits = list(gkf.split(unique_users, groups=unique_users))
    train_idx, val_idx = splits[fold_index]
    return set(unique_users[train_idx].tolist()), set(unique_users[val_idx].tolist())


def filter_by_users(
    user_ids: list[int],
    inputs_list,
    skills_list,
    corrects_list,
    txn_lists,
    keep: set[int],
):
    indices = [i for i, user_id in enumerate(user_ids) if user_id in keep]
    filtered_txns = [txn_lists[i] for i in indices] if txn_lists is not None else None
    return (
        [inputs_list[i] for i in indices],
        [skills_list[i] for i in indices],
        [corrects_list[i] for i in indices],
        filtered_txns,
    )


def train_one_fold(
    model: DKT,
    train_inputs,
    train_skills,
    train_corrects,
    val_inputs,
    val_skills,
    val_corrects,
    val_txns,
    *,
    epochs: int,
    lr: float,
    batch_size: int,
    pos_weight: float,
) -> dict[str, float]:
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    best_pr = -1.0
    best_state = None

    for epoch in range(1, epochs + 1):
        model.train()
        perm = torch.randperm(len(train_inputs))
        epoch_loss = 0.0
        batches = 0
        for start in range(0, len(train_inputs), batch_size):
            idx = perm[start : start + batch_size].tolist()
            batch = pad_sequences(
                [train_inputs[i] for i in idx],
                [train_skills[i] for i in idx],
                [train_corrects[i] for i in idx],
            )
            optimizer.zero_grad()
            preds = model(batch.inputs)
            loss = masked_dkt_loss(
                preds,
                batch.skills,
                batch.corrects,
                batch.mask,
                pos_weight=pos_weight,
            )
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
            batches += 1

        probs, labels, _ = collect_predictions(
            model,
            val_inputs,
            val_skills,
            val_corrects,
            batch_size,
            val_txns,
        )
        metrics = compute_metrics(labels, probs)
        if metrics["pr_auc"] > best_pr:
            best_pr = metrics["pr_auc"]
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

        if epoch == 1 or epoch % 5 == 0 or epoch == epochs:
            print(
                f"  Epoch {epoch:2d}: train_loss={epoch_loss / max(batches, 1):.4f}  "
                f"val ROC-AUC={metrics['roc_auc']:.4f}  PR-AUC={metrics['pr_auc']:.4f}"
            )

    if best_state is not None:
        model.load_state_dict(best_state)

    probs, labels, _ = collect_predictions(
        model,
        val_inputs,
        val_skills,
        val_corrects,
        batch_size,
        val_txns,
    )
    return compute_metrics(labels, probs)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train FraudDKT model.")
    parser.add_argument("--epochs", type=int, default=EPOCHS)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument("--hidden-dim", type=int, default=HIDDEN_DIM)
    parser.add_argument("--lr", type=float, default=LR)
    parser.add_argument("--folds", type=int, default=VAL_FOLDS)
    parser.add_argument("--fold", type=int, default=0)
    parser.add_argument("--max-users", type=int, default=None)
    args = parser.parse_args()

    torch.manual_seed(SEED)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    save_skill_map()

    df = load_train()
    df = assign_skills(df)
    steps = build_sequence_steps(df)
    stats = sequence_stats(steps)
    print(
        f"Sequence steps: {stats['steps']}, users: {stats['users']}, "
        f"fraud rate: {stats['fraud_rate']:.3%}"
    )

    txn_map: dict[tuple[int, int], int] = {}
    by_user: dict[int, list] = {}
    for step in steps:
        by_user.setdefault(step.user_id, []).append(step)
    for user_id, user_steps in by_user.items():
        for idx, step in enumerate(user_steps):
            txn_map[(user_id, idx)] = step.transaction_id

    user_ids, inputs_list, skills_list, corrects_list, txn_lists = build_user_sequences(
        steps_to_dkt_data(steps),
        NUM_SKILLS,
        transaction_ids=txn_map,
    )

    if args.max_users is not None and len(user_ids) > args.max_users:
        keep = set(user_ids[: args.max_users])
        inputs_list, skills_list, corrects_list, txn_lists = filter_by_users(
            user_ids, inputs_list, skills_list, corrects_list, txn_lists, keep
        )
        user_ids = [u for u in user_ids if u in keep]
        print(f"Subsampled to {len(user_ids)} users")

    train_users, val_users = split_users(user_ids, folds=args.folds, fold_index=args.fold)
    train_inputs, train_skills, train_corrects, _ = filter_by_users(
        user_ids, inputs_list, skills_list, corrects_list, txn_lists, train_users
    )
    val_inputs, val_skills, val_corrects, val_txns = filter_by_users(
        user_ids, inputs_list, skills_list, corrects_list, txn_lists, val_users
    )

    train_fraud = sum(1 for seq in train_corrects for value in seq.tolist() if value == 0)
    train_legit = sum(1 for seq in train_corrects for value in seq.tolist() if value == 1)
    pos_weight = train_legit / max(train_fraud, 1)
    print(f"Train users: {len(train_inputs)}, Val users: {len(val_inputs)}, pos_weight={pos_weight:.1f}")

    model = DKT(NUM_SKILLS, args.hidden_dim)
    metrics = train_one_fold(
        model,
        train_inputs,
        train_skills,
        train_corrects,
        val_inputs,
        val_skills,
        val_corrects,
        val_txns,
        epochs=args.epochs,
        lr=args.lr,
        batch_size=args.batch_size,
        pos_weight=pos_weight,
    )
    print_metrics("Validation", metrics)

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    checkpoint = {
        "state_dict": model.state_dict(),
        "num_skills": NUM_SKILLS,
        "hidden_dim": args.hidden_dim,
        "metrics": metrics,
    }
    ckpt_path = ARTIFACTS_DIR / "fraud_dkt.pt"
    torch.save(checkpoint, ckpt_path)
    save_metrics(metrics, ARTIFACTS_DIR / "dkt_metrics.json")
    print(f"Saved checkpoint to {ckpt_path}")


if __name__ == "__main__":
    main()
