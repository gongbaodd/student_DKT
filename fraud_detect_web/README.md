# Fraud Detect Web

Browser demo for the IEEE-CIS **FraudDKT** model. Users pick a product and transaction amount, optionally load or build cardholder history, and get a fraud probability from the LSTM running via ONNX in the browser.

## Prerequisites

1. Trained checkpoint: `fraud_detect/artifacts/fraud_dkt.pt`
   ```bash
   python fraud_detect/train_dkt.py
   ```
2. Node.js 18+

## One-time asset generation

From the repo root (use the project venv if you have one):

```bash
.venv/bin/python fraud_detect/export_fraud_dkt_onnx.py
.venv/bin/python fraud_detect/prepare_fraud_web_data.py
```

This writes to `fraud_detect_web/public/`:

| File | Purpose |
|------|---------|
| `dkt.onnx` | FraudDKT model for onnxruntime-web |
| `model-metadata.json` | Skills, hidden dim, population fraud rate |
| `amount_bins.json` | Train-set amount quartile edges |
| `demo_profiles.json` | Sample cardholder histories |
| `skill_map.json` | Product × quartile skill labels |

## Run locally

```bash
cd fraud_detect_web
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## How it works

| DKT concept | Fraud analog |
|-------------|--------------|
| Student | Cardholder transaction sequence |
| Skill | `ProductCD` × amount quartile (20 buckets) |
| correct = 1 | Legitimate transaction |
| correct = 0 | Fraudulent transaction |

**Fraud score** for a new transaction:

```
fraudProb = 1 - P(legitimate at current skill)
```

With no history, the app falls back to the population fraud rate (~3.5%) until you load a demo profile or add past transactions.

## Build for production

```bash
npm run build
npm run preview
```

## Project layout

```
src/
  dkt/           ONNX runtime + encoding (mirrors Python dkt_encoder)
  hooks/         useFraudSession — history, analyze, persist
  components/    Transaction form, history panel, fraud result, skill chart
  utils/         Skill mapping, fraud scoring, product labels
public/          Generated model + JSON assets
```
