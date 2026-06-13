#!/usr/bin/env python3
"""Train DKT+IRT story point model on done issues."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import torch
import torch.nn as nn

from agile_train.data import build_team_seq, build_tickets, load_issues
from agile_train.irt_model import (
    EMBED_DIM,
    HIDDEN_DIM,
    MAX_POINTS,
    DKT_IRT_StoryPoints,
    build_training_samples,
    ticket_index,
    train_model,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train IRT story point model on done issues.")
    parser.add_argument("--epochs", type=int, default=200)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    done, todos = load_issues()
    tickets = build_tickets(done, todos)
    ticket_ids = list(tickets.keys())
    t_to_idx = ticket_index(ticket_ids)
    team_seq = build_team_seq(done)

    num_components = max(t.component for t in tickets.values()) + 1
    samples = build_training_samples(team_seq, tickets, t_to_idx)

    print(f"Done issues: {len(done)}, todos: {len(todos)}, tickets: {len(ticket_ids)}")
    print(f"Training samples: {len(samples)}")

    torch.manual_seed(args.seed)
    model = DKT_IRT_StoryPoints(
        num_components=num_components,
        num_tickets=len(ticket_ids),
        embed_dim=EMBED_DIM,
        hidden_dim=HIDDEN_DIM,
        max_points=MAX_POINTS,
    )

    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    losses = train_model(model, samples, criterion, optimizer, epochs=args.epochs)

    print(f"\nFinal train MSE: {losses[-1]:.4f}")


if __name__ == "__main__":
    main()
