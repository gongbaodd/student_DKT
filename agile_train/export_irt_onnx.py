#!/usr/bin/env python3
"""Train DKT+IRT model and export to ONNX for agile_web."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import torch
import torch.nn as nn

from agile_train.components import component_name, _refresh_components
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

DEFAULT_OUTPUT = ROOT / "agile_web" / "public" / "irt.onnx"
DEFAULT_METADATA = ROOT / "agile_web" / "public" / "model-metadata.json"
OPSET_VERSION = 17


def export_onnx(
    model_path: Path,
    metadata_path: Path,
    *,
    seed: int = 42,
    epochs: int = 200,
    verbose: bool = True,
) -> None:
    done, todos = load_issues()
    tickets = build_tickets(done, todos)
    ticket_ids = list(tickets.keys())
    t_to_idx = ticket_index(ticket_ids)
    team_seq = build_team_seq(done)

    _refresh_components()
    num_components = max(ticket.component for ticket in tickets.values()) + 1
    component_labels = [component_name(i) for i in range(num_components)]
    samples = build_training_samples(team_seq, tickets, t_to_idx)

    if verbose:
        print(f"Training on {len(done)} done issues, {len(samples)} samples")

    torch.manual_seed(seed)
    model = DKT_IRT_StoryPoints(
        num_components=num_components,
        num_tickets=len(ticket_ids),
        embed_dim=EMBED_DIM,
        hidden_dim=HIDDEN_DIM,
        max_points=MAX_POINTS,
    )

    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    train_model(model, samples, criterion, optimizer, epochs=epochs)

    model.eval()
    model_path.parent.mkdir(parents=True, exist_ok=True)

    dummy_component = torch.zeros(1, 10, dtype=torch.long)
    dummy_points = torch.zeros(1, 10, dtype=torch.float32)
    dummy_next = torch.zeros(1, dtype=torch.long)

    with torch.no_grad():
        torch.onnx.export(
            model,
            (dummy_component, dummy_points, dummy_next),
            model_path,
            input_names=["component_ids", "points", "next_ticket"],
            output_names=["prediction"],
            dynamic_axes={
                "component_ids": {0: "batch", 1: "seq"},
                "points": {0: "batch", 1: "seq"},
                "next_ticket": {0: "batch"},
                "prediction": {0: "batch"},
            },
            opset_version=OPSET_VERSION,
            dynamo=False,
        )

    tickets_meta = {
        issue_key: {"index": t_to_idx[issue_key], "component": tickets[issue_key].component}
        for issue_key in ticket_ids
    }

    metadata = {
        "modelType": "dkt-irt-storypoints",
        "maxPoints": MAX_POINTS,
        "embedDim": EMBED_DIM,
        "hiddenDim": HIDDEN_DIM,
        "numComponents": num_components,
        "numTickets": len(ticket_ids),
        "components": component_labels,
        "tickets": tickets_meta,
        "maxHistory": 64,
        "opset": OPSET_VERSION,
    }
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")

    print(f"\nExported ONNX model to {model_path}")
    print(f"Wrote metadata to {metadata_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train agile IRT and export to ONNX.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--metadata", type=Path, default=DEFAULT_METADATA)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--epochs", type=int, default=200)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    export_onnx(
        args.output,
        args.metadata,
        seed=args.seed,
        epochs=args.epochs,
    )


if __name__ == "__main__":
    main()
