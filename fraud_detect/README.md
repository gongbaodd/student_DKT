# Fraud Detection (IEEE-CIS)

Fraud detection on the [IEEE-CIS Fraud Detection](https://www.kaggle.com/competitions/ieee-fraud-detection) dataset using:

1. **LightGBM baseline** — tabular features with user-grouped cross-validation
2. **FraudDKT** — DKT-inspired LSTM over cardholder transaction sequences

Data lives in [`fraud_detect_data/`](../fraud_detect_data/). Download with:

```bash
python fraud_detect_data/download.py
```

## DKT mapping

| DKT concept | Fraud analog |
|-------------|--------------|
| Student | Cardholder (`card1` + `addr1`) |
| Skill | `ProductCD` × amount quartile (20 buckets) |
| correct = 1 | Legitimate transaction |
| correct = 0 | Fraudulent transaction |
| LSTM state | Evolving trust/risk profile |

## Setup

From repo root:

```bash
pip install -r fraud_detect/requirements.txt
```

## Train

```bash
python fraud_detect/train_baseline.py
python fraud_detect/train_dkt.py
python fraud_detect/evaluate.py
python fraud_detect/predict.py --model baseline
python fraud_detect/predict.py --model dkt
```

Use `--max-users 50000` on DKT training for faster dev runs.

## Outputs

Artifacts are written to `fraud_detect/artifacts/`:

- `baseline_lgbm.txt` — LightGBM model
- `baseline_metrics.json` — baseline CV metrics
- `fraud_dkt.pt` — DKT checkpoint
- `dkt_metrics.json` — DKT validation metrics
- `submission_baseline.csv` / `submission_dkt.csv` — Kaggle submissions

## Limitations

- Identity features cover ~24% of train transactions.
- DKT requires ≥2 transactions per user; cold-start users fall back to population fraud rate.
- User-level GroupKFold prevents card leakage between train and validation.
