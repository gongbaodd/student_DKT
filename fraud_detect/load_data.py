from __future__ import annotations

import pandas as pd

from fraud_detect.config import (
    TEST_IDENTITY,
    TEST_TRANSACTION,
    TRAIN_IDENTITY,
    TRAIN_TRANSACTION,
)

CATEGORICAL_COLS = [
    "ProductCD",
    "card4",
    "card6",
    "P_emaildomain",
    "R_emaildomain",
    "DeviceType",
    "DeviceInfo",
    "id_12",
    "id_30",
    "id_31",
    "id_33",
    "M1",
    "M2",
    "M3",
    "M4",
    "M5",
    "M6",
    "M7",
    "M8",
    "M9",
]


def normalize_identity_columns(df: pd.DataFrame) -> pd.DataFrame:
    renamed = {col: col.replace("-", "_") for col in df.columns if "-" in col}
    if renamed:
        df = df.rename(columns=renamed)
    return df


def load_identity(path) -> pd.DataFrame:
    df = pd.read_csv(path)
    return normalize_identity_columns(df)


def load_transactions(path, *, is_train: bool) -> pd.DataFrame:
    df = pd.read_csv(path)
    df = df.copy()
    df["TransactionDT"] = pd.to_numeric(df["TransactionDT"], errors="coerce")
    df["TransactionAmt"] = pd.to_numeric(df["TransactionAmt"], errors="coerce")
    df["hour_of_day"] = (df["TransactionDT"] // 3600) % 24
    df["day_of_week"] = (df["TransactionDT"] // 86400) % 7
    if is_train:
        df["isFraud"] = df["isFraud"].astype(int)
    return df


def merge_transaction_identity(
    transactions: pd.DataFrame,
    identity: pd.DataFrame,
) -> pd.DataFrame:
    merged = transactions.merge(identity, on="TransactionID", how="left")
    merged = merged.copy()
    merged["has_identity"] = merged["id_01"].notna().astype(int)
    return merged


def add_user_id(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out = out[out["card1"].notna()].copy()
    out["card1"] = out["card1"].astype(int)
    addr = out["addr1"].fillna(-1).astype(int)
    out["user_id"] = out["card1"].astype(str) + "_" + addr.astype(str)
    out["user_id"] = pd.factorize(out["user_id"])[0]
    return out


def fill_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for col in CATEGORICAL_COLS:
        if col in out.columns:
            out[col] = out[col].fillna("__MISSING__").astype(str)
    return out


def load_train() -> pd.DataFrame:
    tx = load_transactions(TRAIN_TRANSACTION, is_train=True)
    identity = load_identity(TRAIN_IDENTITY)
    merged = merge_transaction_identity(tx, identity)
    merged = add_user_id(merged)
    return fill_categoricals(merged)


def load_test() -> pd.DataFrame:
    tx = load_transactions(TEST_TRANSACTION, is_train=False)
    identity = load_identity(TEST_IDENTITY)
    merged = merge_transaction_identity(tx, identity)
    merged = add_user_id(merged)
    return fill_categoricals(merged)
