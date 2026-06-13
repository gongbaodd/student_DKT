# DKT Python — Reference

## Python file tree

```
dkt_encoder.py          # encode_interaction, feature_names, CSV CLI
dkt_model.py            # DKT class, build_student_sequences, dkt_loss, train_dkt
dkt_generator.py        # math: 3 skills, 100 students × 20 steps
museum_dkt_generator.py # museum: 11 skills, 200 students × 30 steps
deep_knowledge_trace.py # Marimo notebook (exploration only)
requirements.txt        # torch>=2.0, onnx>=1.16, onnxscript>=0.1.0
```

## Tensor shapes

| Tensor | Shape |
|--------|-------|
| Encoded step | `[2 * num_skills]` |
| Batch input | `[batch, seq_len, 2 * num_skills]` |
| Predictions | `[batch, seq_len, num_skills]` |

Math: 6-dim input, 3-dim output. Museum: 22-dim input, 11-dim output.

## Training hyperparameters

| Parameter | Default |
|-----------|---------|
| `hidden_dim` | 50 |
| `epochs` | 30 |
| `lr` | 0.01 |
| `val_fraction` | 0.2 |
| `seed` | 42 |

## Synthetic data params

`MASTERY_SAMPLE_MIN/MAX = 0.2/0.8`, `LEARN_RATE = 0.15`, `SLIP_RATE = 0.10`

## Setup

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Optional debug outputs:
```bash
python dkt_generator.py              # → data/dkt_train.csv
python dkt_encoder.py                # → data/dkt_train_vectors.csv
python museum_dkt_generator.py       # → data/museum_dkt_train.csv
```
