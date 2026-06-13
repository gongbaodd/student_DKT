# DKT ONNX Export — Reference

## Export snippet

From `export_museum_dkt_onnx.py`:

```python
import json
import torch
from dkt_model import train_dkt
from museum_dkt_generator import SKILLS, populate_data

OPSET_VERSION = 17
HIDDEN_DIM = 50

num_skills = len(SKILLS)
data = populate_data(seed=42)
model, _ = train_dkt(data, num_skills, hidden_dim=HIDDEN_DIM, seed=42)
model.eval()

dummy = torch.randn(1, 10, 2 * num_skills)
with torch.no_grad():
    torch.onnx.export(
        model, dummy, "museum_web/public/dkt.onnx",
        input_names=["interactions"],
        output_names=["predictions"],
        dynamic_axes={
            "interactions": {0: "batch", 1: "seq"},
            "predictions": {0: "batch", 1: "seq"},
        },
        opset_version=OPSET_VERSION,
        dynamo=False,
    )

metadata = {
    "numSkills": num_skills,
    "inputDim": 2 * num_skills,
    "hiddenDim": HIDDEN_DIM,
    "skills": SKILLS,
    "opset": OPSET_VERSION,
}
```

## ONNX I/O contract

| Name | Shape | Dtype |
|------|-------|-------|
| `interactions` | `[batch, seq, 2*N]` | float32 |
| `predictions` | `[batch, seq, N]` | float32 |

Browser inference reads the **last timestep** of `predictions`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ModuleNotFoundError: torch` | `python -m venv .venv && .venv/bin/pip install -r requirements.txt` |
| Frontend predictions nonsense | `numSkills` / encoding mismatch — see dkt-python skill |
| `predev` fails in frontend | Re-run export script |
