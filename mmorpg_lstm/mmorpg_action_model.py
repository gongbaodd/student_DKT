from __future__ import annotations

from collections import defaultdict

import torch
import torch.nn as nn
import torch.nn.functional as F


def encode_action(action_id: int, num_actions: int) -> list[float]:
    if action_id < 0 or action_id >= num_actions:
        raise ValueError(f"action_id must be in [0, {num_actions}), got {action_id}")
    vector = [0.0] * num_actions
    vector[action_id] = 1.0
    return vector


class NextActionLSTM(nn.Module):
    def __init__(self, num_actions: int, hidden_dim: int = 50):
        super().__init__()
        self.lstm = nn.LSTM(num_actions, hidden_dim, batch_first=True)
        self.out = nn.Linear(hidden_dim, num_actions)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h, _ = self.lstm(x)
        zeros = torch.zeros(x.size(0), 1, h.size(-1), device=x.device, dtype=h.dtype)
        h_prev = torch.cat([zeros, h[:, :-1]], dim=1)
        return F.softmax(self.out(h_prev), dim=-1)


def build_player_sequences(
    data: list[tuple[int, int]],
    num_actions: int,
) -> tuple[torch.Tensor, torch.Tensor]:
    by_player: dict[int, list[int]] = defaultdict(list)
    for user_id, action_id in data:
        by_player[user_id].append(action_id)

    inputs, labels = [], []
    for user_id in sorted(by_player):
        action_ids = by_player[user_id]
        inputs.append(
            torch.tensor(
                [encode_action(action_id, num_actions) for action_id in action_ids],
                dtype=torch.float32,
            )
        )
        labels.append(torch.tensor(action_ids, dtype=torch.long))

    return torch.stack(inputs), torch.stack(labels)


def next_action_loss(
    preds: torch.Tensor,
    labels: torch.Tensor,
) -> torch.Tensor:
    batch, seq_len, num_actions = preds.shape
    return F.cross_entropy(
        preds.reshape(batch * seq_len, num_actions),
        labels.reshape(batch * seq_len),
    )


def next_action_accuracy(preds: torch.Tensor, labels: torch.Tensor) -> float:
    predicted = preds.argmax(dim=-1)
    return (predicted == labels).float().mean().item()


def train_next_action(
    data: list[tuple[int, int]],
    num_actions: int,
    *,
    hidden_dim: int = 50,
    epochs: int = 30,
    lr: float = 0.01,
    val_fraction: float = 0.2,
    seed: int = 42,
    verbose: bool = True,
) -> tuple[NextActionLSTM, dict[str, torch.Tensor]]:
    torch.manual_seed(seed)

    inputs, labels = build_player_sequences(data, num_actions)
    num_players = inputs.size(0)

    perm = torch.randperm(num_players)
    val_size = max(1, int(num_players * val_fraction))
    val_idx, train_idx = perm[:val_size], perm[val_size:]

    train_inputs, train_labels = inputs[train_idx], labels[train_idx]
    val_inputs, val_labels = inputs[val_idx], labels[val_idx]

    model = NextActionLSTM(num_actions, hidden_dim)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    if verbose:
        print(
            f"NextActionLSTM: {num_actions} actions, input_dim={num_actions}, "
            f"hidden_dim={hidden_dim}"
        )
        print(f"Sequences: {num_players} players x {inputs.size(1)} steps")
        print(f"Train: {train_idx.numel()} players, Val: {val_idx.numel()} players")

    val_preds = None
    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad()
        train_preds = model(train_inputs)
        loss = next_action_loss(train_preds, train_labels)
        loss.backward()
        optimizer.step()

        model.eval()
        with torch.no_grad():
            val_preds = model(val_inputs)
            val_loss = next_action_loss(val_preds, val_labels)
            val_acc = next_action_accuracy(val_preds, val_labels)

        if verbose and (epoch == 1 or epoch % 5 == 0 or epoch == epochs):
            print(
                f"Epoch {epoch:2d}: train_loss={loss.item():.4f}, "
                f"val_loss={val_loss.item():.4f}, val_acc={val_acc:.1%}"
            )

    assert val_preds is not None
    return model, {
        "val_preds": val_preds,
        "val_labels": val_labels,
    }
