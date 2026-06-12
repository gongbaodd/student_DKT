# Math DKT Frontend

Pure frontend demo that runs a Deep Knowledge Tracing (DKT) model in the browser with [onnxruntime-web](https://onnxruntime.ai/docs/tutorials/web/). Students answer random addition, subtraction, and multiplication questions; a sticky bottom panel shows the model's guess for whether they can handle the current skill.

## Prerequisites

- Node.js 18+
- Python 3.10+ (for regenerating the ONNX model)

## Regenerate the ONNX model

From the repository root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python export_dkt_onnx.py
```

This trains the DKT on synthetic data and writes:

- `math/public/dkt.onnx`
- `math/public/model-metadata.json`

## Run the frontend

```bash
cd math
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Build for production

```bash
cd math
npm run build
npm run preview
```

## How it works

1. Each student answer is encoded as a 6-dimensional one-hot vector (matching `dkt_encoder.py`).
2. Before each question, the app runs the ONNX model on `[history..., dummy_step]` and reads the probability for the current skill.
3. The bottom panel shows that probability plus per-skill bars for all three skills.
