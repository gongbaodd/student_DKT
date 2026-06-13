---
name: dkt-onnx-export
description: >-
  Export trained DKT models to ONNX and model-metadata.json for student-dkt
  browser apps. Use when running export_dkt_onnx.py, creating a new export
  script, or preparing dkt.onnx for Vite public/ folders.
---

# DKT ONNX Export

Train DKT in Python, export to `public/dkt.onnx` + `model-metadata.json`. No backend at runtime.

Requires encoding knowledge from [dkt-python](../dkt-python/SKILL.md). Consumed by [dkt-frontend-onnx](../dkt-frontend-onnx/SKILL.md).

## Export scripts

| Script | Output |
|--------|--------|
| `export_dkt_onnx.py` | `math/public/dkt.onnx` |
| `export_museum_dkt_onnx.py` | `museum_web/public/dkt.onnx` |

Both follow: `populate_data(seed)` → `train_dkt()` → `torch.onnx.export` → metadata JSON.

## Export checklist

1. `data = populate_data(seed)` — `(user_id, skill_id, correct)` tuples
2. `model, _ = train_dkt(data, num_skills, hidden_dim=50)`
3. `model.eval()`
4. Dummy: `torch.randn(1, 10, 2 * num_skills)`
5. Export with:
   - `input_names=["interactions"]`
   - `output_names=["predictions"]`
   - `dynamic_axes`: batch (0) + seq (1) on both tensors
   - `opset_version=17`, `dynamo=False`
6. Write `model-metadata.json` next to ONNX

## metadata schema

```json
{
  "numSkills": 11,
  "inputDim": 22,
  "hiddenDim": 50,
  "skills": ["skill name 0", "..."],
  "opset": 17
}
```

`skills[i]` must match `skill_id = i` in your encoder. `inputDim` must equal `2 * numSkills`.

## Commands

```bash
# From repo root (venv with torch installed)
python export_dkt_onnx.py
python export_museum_dkt_onnx.py

# Museum also needs domain JSON (not ONNX)
python museum/prepare_web_data.py
```

## New app export

Copy `export_museum_dkt_onnx.py`:
- Import your generator's `SKILLS` and `populate_data`
- Set `DEFAULT_OUTPUT = Path("<app>/public/dkt.onnx")`
- Set `DEFAULT_METADATA = Path("<app>/public/model-metadata.json")`

## Verify before frontend dev

```
- [ ] public/dkt.onnx exists
- [ ] model-metadata.json numSkills matches encoder
- [ ] skills[] order matches skill_id in domain data
```

## Related skills

- Training/encoding: [dkt-python](../dkt-python/SKILL.md)
- Load in browser: [dkt-frontend-onnx](../dkt-frontend-onnx/SKILL.md)

Details: [reference.md](reference.md)
