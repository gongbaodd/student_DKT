from __future__ import annotations

import pandas as pd

from fraud_detect.load_data import CATEGORICAL_COLS

NUMERIC_BASE = [
    "TransactionAmt",
    "TransactionDT",
    "dist1",
    "dist2",
    "hour_of_day",
    "day_of_week",
    "has_identity",
]

COUNT_COLS = [f"C{i}" for i in range(1, 15)]
DELTA_COLS = [f"D{i}" for i in range(1, 16)]
V_COLS = [f"V{i}" for i in range(1, 340)]

CATEGORICAL_FEATURES = [
    "ProductCD",
    "card4",
    "card6",
    "P_emaildomain",
    "DeviceType",
    "id_30",
]


def build_tabular_features(
    df: pd.DataFrame,
    *,
    full_v: bool = False,
) -> tuple[pd.DataFrame, pd.Series | None]:
    numeric_cols = NUMERIC_BASE + COUNT_COLS + DELTA_COLS
    if full_v:
        numeric_cols += V_COLS
    else:
        numeric_cols += V_COLS[:50]

    available_numeric = [col for col in numeric_cols if col in df.columns]
    available_categorical = [col for col in CATEGORICAL_FEATURES if col in df.columns]

    features = df[available_numeric + available_categorical + ["user_id", "TransactionID"]].copy()
    for col in available_numeric:
        features[col] = pd.to_numeric(features[col], errors="coerce")

    for col in available_categorical:
        features[col] = features[col].fillna("__MISSING__").astype("category")

    label = df["isFraud"].astype(int) if "isFraud" in df.columns else None
    return features, label
