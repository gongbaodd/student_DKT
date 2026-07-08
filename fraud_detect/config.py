from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "fraud_detect_data" / "ieee-fraud-detection"
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"

TRAIN_TRANSACTION = DATA_DIR / "train_transaction.csv"
TRAIN_IDENTITY = DATA_DIR / "train_identity.csv"
TEST_TRANSACTION = DATA_DIR / "test_transaction.csv"
TEST_IDENTITY = DATA_DIR / "test_identity.csv"
SAMPLE_SUBMISSION = DATA_DIR / "sample_submission.csv"

NUM_SKILLS = 20
PRODUCT_CODES = ["C", "H", "R", "S", "W"]
AMOUNT_QUARTILES = 4

HIDDEN_DIM = 128
EPOCHS = 20
LR = 0.001
BATCH_SIZE = 256
VAL_FOLDS = 5
MIN_SEQUENCE_LEN = 2
SEED = 42

POPULATION_FRAUD_RATE = 20663 / 590540
