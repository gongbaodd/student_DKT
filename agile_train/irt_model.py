"""DKT + IRT story point model (extracted from story_point_prediction.py)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import NamedTuple

import torch
import torch.nn as nn

MAX_POINTS = 50.0
EMBED_DIM = 16
HIDDEN_DIM = 32


class TrainingSample(NamedTuple):
    component_ids: torch.Tensor
    points: torch.Tensor
    next_ticket: torch.Tensor
    target: torch.Tensor


@dataclass(frozen=True)
class Ticket:
    component: int


class DKT_IRT_StoryPoints(nn.Module):
    def __init__(
        self,
        num_components: int,
        num_tickets: int,
        embed_dim: int = EMBED_DIM,
        hidden_dim: int = HIDDEN_DIM,
        max_points: float = MAX_POINTS,
    ) -> None:
        super().__init__()
        self.max_points = max_points
        self.component_emb = nn.Embedding(num_components, embed_dim)
        self.lstm = nn.LSTM(embed_dim + 1, hidden_dim, batch_first=True)
        self.theta_layer = nn.Linear(hidden_dim, 1)
        self.beta = nn.Embedding(num_tickets, 1)

    def forward(
        self,
        component_ids: torch.Tensor,
        points: torch.Tensor,
        next_ticket: torch.Tensor,
    ) -> torch.Tensor:
        emb = self.component_emb(component_ids)
        x = torch.cat([emb, points.unsqueeze(-1)], dim=-1)
        h, _ = self.lstm(x)
        theta = self.theta_layer(h[:, -1])
        beta = self.beta(next_ticket)
        pred = self.max_points * torch.sigmoid(beta - theta)
        return pred.squeeze(-1)


def ticket_index(ticket_ids: list[str]) -> dict[str, int]:
    return {ticket_id: index for index, ticket_id in enumerate(ticket_ids)}


def build_training_samples(
    team_seq: list[tuple[str, float]],
    tickets: dict[str, Ticket],
    t_to_idx: dict[str, int],
    max_points: float = MAX_POINTS,
    max_history: int = 64,
) -> list[TrainingSample]:
    samples: list[TrainingSample] = []
    for target_pos in range(1, len(team_seq)):
        history = team_seq[max(0, target_pos - max_history) : target_pos]
        next_tid, target_points = team_seq[target_pos]

        component_ids = torch.tensor(
            [tickets[tid].component for tid, _ in history],
            dtype=torch.long,
        )
        points = torch.tensor(
            [pts / max_points for _, pts in history],
            dtype=torch.float32,
        )
        next_ticket = torch.tensor(t_to_idx[next_tid], dtype=torch.long)
        target = torch.tensor(target_points, dtype=torch.float32)
        samples.append(TrainingSample(component_ids, points, next_ticket, target))
    return samples


def collate_samples(samples: list[TrainingSample]) -> tuple[torch.Tensor, ...]:
    max_len = max(sample.component_ids.size(0) for sample in samples)
    batch_size = len(samples)

    component_ids = torch.zeros(batch_size, max_len, dtype=torch.long)
    points = torch.zeros(batch_size, max_len, dtype=torch.float32)
    next_ticket = torch.stack([sample.next_ticket for sample in samples])
    targets = torch.stack([sample.target for sample in samples])

    for row, sample in enumerate(samples):
        seq_len = sample.component_ids.size(0)
        component_ids[row, :seq_len] = sample.component_ids
        points[row, :seq_len] = sample.points

    return component_ids, points, next_ticket, targets


def train_model(
    model: DKT_IRT_StoryPoints,
    samples: list[TrainingSample],
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    epochs: int = 200,
) -> list[float]:
    losses: list[float] = []
    for epoch in range(1, epochs + 1):
        component_ids, points, next_ticket, targets = collate_samples(samples)
        pred = model(component_ids, points, next_ticket)
        loss = criterion(pred, targets)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        losses.append(loss.item())

        if epoch == 1 or epoch % 50 == 0 or epoch == epochs:
            print(f"Epoch {epoch:3d}: train_mse={loss.item():.4f}")

    return losses


def predict_story_points(
    model: DKT_IRT_StoryPoints,
    team_seq: list[tuple[str, float]],
    next_ticket_id: str,
    tickets: dict[str, Ticket],
    t_to_idx: dict[str, int],
    max_points: float = MAX_POINTS,
    max_history: int = 64,
) -> float:
    model.eval()
    history = team_seq[-max_history:]
    with torch.no_grad():
        component_ids = torch.tensor(
            [[tickets[tid].component for tid, _ in history]],
            dtype=torch.long,
        )
        points = torch.tensor(
            [[pts / max_points for _, pts in history]],
            dtype=torch.float32,
        )
        next_ticket = torch.tensor([t_to_idx[next_ticket_id]], dtype=torch.long)
        return model(component_ids, points, next_ticket).item()
