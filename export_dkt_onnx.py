#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import torch

from dkt_generator import NUM_STUDENTS, SKILLS, generate_student_sequence
from dkt_model import train_dkt

DEFAULT_OUTPUT = Path("math/public/dkt.onnx")
DEFAULT_METADATA = Path("math/public/model-metadata.json")
OPSET_VERSION = 17
HIDDEN_DIM = 50


def populate_data(seed: int = 42) -> list[tuple[int, int, int]]:
    rng = random.Random(seed)
    rows: list[tuple[int, int, int]] = []
    for student_id in range(NUM_STUDENTS):
        rows.extend(generate_student_sequence(student_id, rng))
    return rows


def export_onnx(
    model_path: Path,
    metadata_path: Path,
    *,
    seed: int = 42,
    verbose: bool = True,
) -> None:
    num_skills = len(SKILLS)
    data = populate_data(seed)
    model, _ = train_dkt(data, num_skills, hidden_dim=HIDDEN_DIM, seed=seed, verbose=verbose)

    model.eval()
    model_path.parent.mkdir(parents=True, exist_ok=True)

    dummy = torch.randn(1, 10, 2 * num_skills)
    with torch.no_grad():
        torch.onnx.export(
            model,
            dummy,
            model_path,
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
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n")

    print(f"\nExported ONNX model to {model_path}")
    print(f"Wrote metadata to {metadata_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train DKT and export to ONNX.")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"ONNX output path (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--metadata",
        type=Path,
        default=DEFAULT_METADATA,
        help=f"Metadata JSON path (default: {DEFAULT_METADATA})",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="RNG seed for training data and model init (default: 42)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    export_onnx(args.output, args.metadata, seed=args.seed)


if __name__ == "__main__":
    main()
