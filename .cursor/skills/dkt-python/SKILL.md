---
name: dkt-python
description: >-
  Deep Knowledge Tracing in student-dkt: LSTM model, one-hot interaction
  encoding, synthetic data generation, and train_dkt(). Use when implementing
  DKT training, encoding interactions, generating skill data, or adapting
  dkt_model.py / dkt_encoder.py for a new domain.
---

# DKT Python

Python-side DKT for this repo. Pair with [dkt-onnx-export](../dkt-onnx-export/SKILL.md) for deployment.

## Domain mapping

Map your product onto `(user_id, skill_id, correct)` tuples:

| DKT concept | Math (`math/`) | Museum (`museum_web/`) |
|-------------|----------------|------------------------|
| Question | Math problem | Museum card |
| Skill | Addition / Subtraction / Multiplication | Museum cluster |
| Correct (1) | Right answer | Swipe right (like) |
| Wrong (0) | Wrong answer | Swipe left (pass) |

## Modules (reuse, do not reinvent)

| File | Role |
|------|------|
| `dkt_encoder.py` | `encode_interaction(skill_id, correct, num_skills)` |
| `dkt_model.py` | `DKT` LSTM + `build_student_sequences` + `train_dkt()` |
| `dkt_generator.py` | Math synthetic data (3 skills) |
| `museum_dkt_generator.py` | Museum synthetic data (11 skills from CSV) |

## Encoding

```
vector length = 2 * num_skills
layout: [skill0_correct … skill{N-1}_correct, skill0_wrong … skill{N-1}_wrong]

index = skill_id              if correct
index = num_skills + skill_id if wrong
```

```python
from dkt_encoder import encode_interaction
vector = encode_interaction(skill_id=1, correct=1, num_skills=3)
# → [0, 1, 0, 0, 0, 0]
```

## Model (`dkt_model.py`)

- Input: `[batch, seq_len, 2 * num_skills]`
- LSTM hidden: `50`
- Output: `[batch, seq_len, num_skills]` sigmoid — P(correct) per skill at **next** step
- Uses `h_{t-1}` (shifted LSTM output), not `h_t`

Training defaults: Adam `lr=0.01`, 30 epochs, 20% val split. Loss: BCE on practiced skill only.

## Synthetic data

Each virtual student has per-skill mastery in `[0.2, 0.8]`:

1. Pick random `skill_id`
2. `correct = 1` if `random() < mastery[skill]`
3. Update mastery (`LEARN_RATE=0.15`, `SLIP_RATE=0.10`)
4. Append `(user_id, skill_id, correct)`

Copy `dkt_generator.py` or `museum_dkt_generator.py`; change `SKILLS`, `NUM_STUDENTS`, `INTERACTIONS_PER_STUDENT`.

## Train programmatically

```python
from dkt_model import train_dkt
from museum_dkt_generator import populate_data, SKILLS

data = populate_data(seed=42)
model, results = train_dkt(data, num_skills=len(SKILLS), hidden_dim=50)
```

## New domain checklist

```
- [ ] Define SKILLS list (ordered; index = skill_id)
- [ ] Map questions → skill_id, responses → correct (0/1)
- [ ] Create or adapt data generator → list of (user_id, skill_id, correct)
- [ ] train_dkt(data, len(SKILLS))
- [ ] Verify encoding with dkt_encoder.py before export
```

## Related skills

- Export: [dkt-onnx-export](../dkt-onnx-export/SKILL.md)
- Browser inference: [dkt-frontend-onnx](../dkt-frontend-onnx/SKILL.md)
- UI: [dkt-mantine-showcase](../dkt-mantine-showcase/SKILL.md)

Details: [reference.md](reference.md)
