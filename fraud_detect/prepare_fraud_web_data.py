#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fraud_detect.config import AMOUNT_QUARTILES, SEED
from fraud_detect.load_data import load_train
from fraud_detect.skills import apply_amount_bins, assign_skills, save_skill_map

DEFAULT_PUBLIC = ROOT / "fraud_detect_web" / "public"
MIN_DEMO_TXNS = 5
NUM_DEMO_PROFILES = 5


def compute_amount_bin_edges(train_df: pd.DataFrame) -> list[float]:
    edges = np.quantile(
        train_df["TransactionAmt"].dropna(),
        np.linspace(0, 1, AMOUNT_QUARTILES + 1),
    )
    return [float(value) for value in np.unique(edges)]


def prepare_training_df(train_df: pd.DataFrame) -> pd.DataFrame:
    bins = apply_amount_bins(train_df, train_df)
    prepared = assign_skills(train_df, amount_bins=bins)
    return prepared.sort_values(["user_id", "TransactionDT", "TransactionID"])


def sample_demo_profiles(prepared: pd.DataFrame, *, seed: int = SEED) -> list[dict]:
    grouped = prepared.groupby("user_id", sort=False)
    eligible: list[tuple[int, pd.DataFrame]] = [
        (int(user_id), group)
        for user_id, group in grouped
        if len(group) >= MIN_DEMO_TXNS
    ]
    if not eligible:
        return []

    rng = np.random.default_rng(seed)
    fraud_users = [
        (uid, grp) for uid, grp in eligible if grp["isFraud"].sum() > 0
    ]
    legit_users = [
        (uid, grp) for uid, grp in eligible if grp["isFraud"].sum() == 0
    ]

    picks: list[tuple[int, pd.DataFrame]] = []
    if fraud_users:
        idx = rng.choice(len(fraud_users), size=min(3, len(fraud_users)), replace=False)
        picks.extend(fraud_users[i] for i in idx)
    if legit_users:
        idx = rng.choice(len(legit_users), size=min(2, len(legit_users)), replace=False)
        picks.extend(legit_users[i] for i in idx)

    if len(picks) < NUM_DEMO_PROFILES:
        remaining = [p for p in eligible if p not in picks]
        if remaining:
            extra = min(NUM_DEMO_PROFILES - len(picks), len(remaining))
            idx = rng.choice(len(remaining), size=extra, replace=False)
            picks.extend(remaining[i] for i in idx)

    profiles: list[dict] = []
    for profile_idx, (user_id, group) in enumerate(picks[:NUM_DEMO_PROFILES]):
        fraud_count = int(group["isFraud"].sum())
        legit_count = len(group) - fraud_count
        if fraud_count == 0:
            label = "Trusted cardholder"
            description = (
                f"{len(group)} legitimate transactions across product categories."
            )
        elif fraud_count <= 2:
            label = "Mixed activity"
            description = (
                f"{legit_count} legit and {fraud_count} flagged transaction(s) in history."
            )
        else:
            label = "High-risk pattern"
            description = (
                f"{fraud_count} fraudulent transactions out of {len(group)} total."
            )

        profiles.append(
            {
                "id": f"demo-{profile_idx + 1}",
                "label": label,
                "description": description,
                "userId": user_id,
                "transactions": [
                    {
                        "productCD": str(row.ProductCD),
                        "amount": round(float(row.TransactionAmt), 2),
                        "isFraud": bool(row.isFraud),
                    }
                    for row in group.itertuples(index=False)
                ],
            }
        )

    return profiles


def prepare_web_data(public_dir: Path, *, seed: int = SEED) -> None:
    public_dir.mkdir(parents=True, exist_ok=True)

    train_df = load_train()
    edges = compute_amount_bin_edges(train_df)
    (public_dir / "amount_bins.json").write_text(
        json.dumps({"edges": edges, "quartiles": AMOUNT_QUARTILES}, indent=2) + "\n"
    )

    prepared = prepare_training_df(train_df)
    profiles = sample_demo_profiles(prepared, seed=seed)
    (public_dir / "demo_profiles.json").write_text(
        json.dumps({"profiles": profiles}, indent=2) + "\n"
    )

    skill_map_path = save_skill_map()
    shutil.copy(skill_map_path, public_dir / "skill_map.json")

    print(f"Wrote amount_bins.json ({len(edges)} edges)")
    print(f"Wrote demo_profiles.json ({len(profiles)} profiles)")
    print(f"Copied skill_map.json to {public_dir / 'skill_map.json'}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare static JSON assets for fraud_detect_web."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_PUBLIC,
        help=f"Public assets directory (default: {DEFAULT_PUBLIC})",
    )
    parser.add_argument("--seed", type=int, default=SEED)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    prepare_web_data(args.output, seed=args.seed)


if __name__ == "__main__":
    main()
