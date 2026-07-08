from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from fraud_detect.config import MIN_SEQUENCE_LEN
from fraud_detect.skills import apply_amount_bins, assign_skills, fit_amount_bins


@dataclass(frozen=True)
class SequenceStep:
    user_id: int
    skill_id: int
    correct: int
    transaction_id: int


def build_sequence_steps(
    df: pd.DataFrame,
    *,
    train_df: pd.DataFrame | None = None,
    min_len: int = MIN_SEQUENCE_LEN,
) -> list[SequenceStep]:
    if train_df is None:
        amount_bins = fit_amount_bins(df)
        prepared = assign_skills(df, amount_bins=amount_bins)
    else:
        bins = apply_amount_bins(df, train_df)
        prepared = assign_skills(df, amount_bins=bins)

    prepared = prepared.sort_values(["user_id", "TransactionDT", "TransactionID"])
    steps: list[SequenceStep] = []

    for user_id, group in prepared.groupby("user_id", sort=False):
        if len(group) < min_len:
            continue
        for row in group.itertuples(index=False):
            correct = 0 if getattr(row, "isFraud", 0) == 1 else 1
            steps.append(
                SequenceStep(
                    user_id=int(user_id),
                    skill_id=int(row.skill_id),
                    correct=correct,
                    transaction_id=int(row.TransactionID),
                )
            )
    return steps


def steps_to_dkt_data(steps: list[SequenceStep]) -> list[tuple[int, int, int]]:
    return [(step.user_id, step.skill_id, step.correct) for step in steps]


def transaction_index(steps: list[SequenceStep]) -> dict[int, SequenceStep]:
    return {step.transaction_id: step for step in steps}


def sequence_stats(steps: list[SequenceStep]) -> dict[str, float | int]:
    if not steps:
        return {"steps": 0, "users": 0, "fraud_rate": 0.0}
    users = {step.user_id for step in steps}
    fraud = sum(1 for step in steps if step.correct == 0)
    return {
        "steps": len(steps),
        "users": len(users),
        "fraud_rate": fraud / len(steps),
    }
