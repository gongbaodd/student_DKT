# Museum Match — DKT Swipe App

Tinder-style museum discovery powered by Deep Knowledge Tracing. Museums are questions, clusters are skills. Inference runs entirely in the browser via ONNX Runtime Web.

## Prerequisites

Generate museum data and train/export the ONNX model (from repo root):

```bash
python museum/prepare_web_data.py
python export_museum_dkt_onnx.py
```

Requires Python with `torch`, `onnx`, and `onnxscript` (see root `requirements.txt`).

## Development

```bash
cd museum_web
npm install
npm run dev
```

`predev` checks that `public/dkt.onnx` exists before starting.

## Build

```bash
npm run build
npm run preview
```

## How it works

- **Swipe right** = like (DKT `correct=1`)
- **Swipe left** = pass/dislike (DKT `correct=0`)
- Each museum maps to a cluster skill (11 themes from `museum/cluster_names.csv`)
- The LSTM model predicts P(like) per cluster; the next card is chosen from the highest-scoring unseen cluster
- Session state persists in `localStorage`
