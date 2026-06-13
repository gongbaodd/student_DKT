---
name: dkt-onnx-showcase
description: >-
  Index for student-dkt DKT skills: points to dkt-python, dkt-onnx-export,
  dkt-frontend-onnx, and dkt-mantine-showcase. Use for end-to-end overview
  or when unsure which DKT skill to load.
---

# DKT Skills Index

The DKT stack is split into four focused skills. Load the one that matches your task.

## Skills

| Skill | When to use |
|-------|-------------|
| [dkt-python](dkt-python/SKILL.md) | LSTM model, encoding, synthetic data, `train_dkt()` |
| [dkt-onnx-export](dkt-onnx-export/SKILL.md) | `torch.onnx.export`, `model-metadata.json`, `public/dkt.onnx` |
| [dkt-frontend-onnx](dkt-frontend-onnx/SKILL.md) | `onnxruntime-web`, Vite WASM, `DktModel`, `encoder.ts` |
| [dkt-mantine-showcase](dkt-mantine-showcase/SKILL.md) | React + Mantine UI, session hook, swipe deck, dashboard |

## Pipeline

```
dkt-python → dkt-onnx-export → dkt-frontend-onnx → dkt-mantine-showcase
  train        export ONNX        browser inference     showcase UI
```

## Reference apps

- `math/` — minimal (frontend-onnx only, plain CSS)
- `museum_web/` — full stack (all four skills)

## End-to-end checklist (new variant)

```
- [ ] dkt-python: SKILLS + data generator + train
- [ ] dkt-onnx-export: export to <app>/public/
- [ ] dkt-frontend-onnx: copy src/dkt/, vite config, predev guard
- [ ] dkt-mantine-showcase: session hook + input UI + dashboard
```

## Quick commands

```bash
.venv/bin/pip install -r requirements.txt
python export_dkt_onnx.py              # math
python museum/prepare_web_data.py      # museum JSON
python export_museum_dkt_onnx.py       # museum ONNX
cd museum_web && npm run dev
```
