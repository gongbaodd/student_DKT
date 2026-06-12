from __future__ import annotations

from collections import defaultdict

import torch
import torch.nn as nn
import torch.nn.functional as F

from dkt_encoder import encode_interaction


class DKT(nn.Module):
    def __init__(self, num_skills: int, hidden_dim: int = 50):
        super().__init__()
        input_dim = 2 * num_skills
        self.lstm = nn.LSTM(input_dim, hidden_dim, batch_first=True)
        self.out = nn.Linear(hidden_dim, num_skills)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h, _ = self.lstm(x)
        zeros = torch.zeros(x.size(0), 1, h.size(-1), device=x.device, dtype=h.dtype)
        h_prev = torch.cat([zeros, h[:, :-1]], dim=1)
        return torch.sigmoid(self.out(h_prev))


def build_student_sequences(
    data: list[tuple[int, int, int]],
    num_skills: int,
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    by_student: dict[int, list[tuple[int, int]]] = defaultdict(list)
    for user_id, skill_id, correct in data:
        by_student[user_id].append((skill_id, correct))

    inputs, skills, corrects = [], [], []
    for user_id in sorted(by_student):
        seq = by_student[user_id]
        skills_t = [skill_id for skill_id, _ in seq]
        corrects_t = [correct for _, correct in seq]
        inputs_t = [
            encode_interaction(skill_id, correct, num_skills)
            for skill_id, correct in seq
        ]
        inputs.append(torch.tensor(inputs_t, dtype=torch.float32))
        skills.append(torch.tensor(skills_t, dtype=torch.long))
        corrects.append(torch.tensor(corrects_t, dtype=torch.float32))

    return torch.stack(inputs), torch.stack(skills), torch.stack(corrects)


def dkt_loss(
    preds: torch.Tensor,
    skills: torch.Tensor,
    corrects: torch.Tensor,
) -> torch.Tensor:
    selected = preds.gather(2, skills.unsqueeze(-1)).squeeze(-1)
    return F.binary_cross_entropy(selected, corrects)


def train_dkt(
    data: list[tuple[int, int, int]],
    num_skills: int,
    *,
    hidden_dim: int = 50,
    epochs: int = 30,
    lr: float = 0.01,
    val_fraction: float = 0.2,
    seed: int = 42,
    verbose: bool = True,
) -> tuple[DKT, dict[str, torch.Tensor]]:
    torch.manual_seed(seed)

    inputs, skills, corrects = build_student_sequences(data, num_skills)
    num_students = inputs.size(0)

    perm = torch.randperm(num_students)
    val_size = max(1, int(num_students * val_fraction))
    val_idx, train_idx = perm[:val_size], perm[val_size:]

    train_inputs, train_skills, train_corrects = (
        inputs[train_idx],
        skills[train_idx],
        corrects[train_idx],
    )
    val_inputs, val_skills, val_corrects = (
        inputs[val_idx],
        skills[val_idx],
        corrects[val_idx],
    )

    model = DKT(num_skills, hidden_dim)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    if verbose:
        print(
            f"DKT: {num_skills} skills, input_dim={2 * num_skills}, "
            f"hidden_dim={hidden_dim}"
        )
        print(f"Sequences: {num_students} students x {inputs.size(1)} steps")
        print(f"Train: {train_idx.numel()} students, Val: {val_idx.numel()} students")

    val_preds = None
    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad()
        train_preds = model(train_inputs)
        loss = dkt_loss(train_preds, train_skills, train_corrects)
        loss.backward()
        optimizer.step()

        model.eval()
        with torch.no_grad():
            val_preds = model(val_inputs)
            val_loss = dkt_loss(val_preds, val_skills, val_corrects)
            val_selected = val_preds.gather(2, val_skills.unsqueeze(-1)).squeeze(-1)
            val_acc = (val_selected.round() == val_corrects).float().mean().item()

        if verbose and (epoch == 1 or epoch % 5 == 0 or epoch == epochs):
            print(
                f"Epoch {epoch:2d}: train_loss={loss.item():.4f}, "
                f"val_loss={val_loss.item():.4f}, val_acc={val_acc:.1%}"
            )

    assert val_preds is not None
    return model, {
        "val_preds": val_preds,
        "val_skills": val_skills,
        "val_corrects": val_corrects,
    }
