from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from fraud_detect.config import (
    AMOUNT_QUARTILES,
    ARTIFACTS_DIR,
    NUM_SKILLS,
    PRODUCT_CODES,
)

PRODUCT_INDEX = {code: idx for idx, code in enumerate(PRODUCT_CODES)}


def amount_quartile(amounts: pd.Series, *, bins: pd.Series | None = None) -> pd.Series:
    if bins is None:
        bins = pd.qcut(amounts, q=AMOUNT_QUARTILES, labels=False, duplicates="drop")
    return bins.fillna(0).astype(int).clip(0, AMOUNT_QUARTILES - 1)


def skill_id(product_cd: str, quartile: int) -> int:
    product_idx = PRODUCT_INDEX.get(str(product_cd), len(PRODUCT_CODES) - 1)
    return product_idx * AMOUNT_QUARTILES + int(quartile)


def assign_skills(
    df: pd.DataFrame,
    *,
    amount_bins: pd.Series | None = None,
) -> pd.DataFrame:
    out = df.copy()
    quartiles = amount_quartile(out["TransactionAmt"], bins=amount_bins)
    out["amount_quartile"] = quartiles
    out["skill_id"] = [
        skill_id(product, q)
        for product, q in zip(out["ProductCD"], out["amount_quartile"], strict=True)
    ]
    if out["skill_id"].max() >= NUM_SKILLS:
        raise ValueError(
            f"skill_id out of range: max={out['skill_id'].max()}, NUM_SKILLS={NUM_SKILLS}"
        )
    return out


def fit_amount_bins(train_df: pd.DataFrame) -> pd.Series:
    return pd.qcut(
        train_df["TransactionAmt"],
        q=AMOUNT_QUARTILES,
        labels=False,
        duplicates="drop",
    )


def apply_amount_bins(df: pd.DataFrame, train_df: pd.DataFrame) -> pd.Series:
    edges = np.quantile(
        train_df["TransactionAmt"].dropna(),
        np.linspace(0, 1, AMOUNT_QUARTILES + 1),
    )
    edges = np.unique(edges)
    if len(edges) < 3:
        return pd.Series(0, index=df.index, dtype=int)
    labels = pd.cut(
        df["TransactionAmt"],
        bins=edges,
        labels=False,
        include_lowest=True,
    )
    return labels.fillna(0).astype(int).clip(0, AMOUNT_QUARTILES - 1)


def build_skill_map() -> dict[str, list[str]]:
    skills: list[str] = []
    for product in PRODUCT_CODES:
        for q in range(AMOUNT_QUARTILES):
            skills.append(f"{product}_Q{q + 1}")
    return {"num_skills": NUM_SKILLS, "skills": skills}


def save_skill_map(path: Path | None = None) -> Path:
    target = path or ARTIFACTS_DIR / "skill_map.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(build_skill_map(), indent=2))
    return target
