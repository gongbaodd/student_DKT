#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dkt_model import DKT
from fraud_detect.config import (
    AMOUNT_QUARTILES,
    ARTIFACTS_DIR,
    HIDDEN_DIM,
    NUM_SKILLS,
    POPULATION_FRAUD_RATE,
    PRODUCT_CODES,
)
from fraud_detect.skills import build_skill_map

DEFAULT_CHECKPOINT = ARTIFACTS_DIR / "fraud_dkt.pt"
DEFAULT_OUTPUT = ROOT / "fraud_detect_web" / "public" / "dkt.onnx"
DEFAULT_METADATA = ROOT / "fraud_detect_web" / "public" / "model-metadata.json"
OPSET_VERSION = 17


def load_model(checkpoint_path: Path) -> tuple[DKT, dict]:
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    num_skills = int(checkpoint["num_skills"])
    hidden_dim = int(checkpoint["hidden_dim"])
    model = DKT(num_skills, hidden_dim)
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()
    return model, checkpoint


def export_onnx(
    checkpoint_path: Path,
    model_path: Path,
    metadata_path: Path,
) -> None:
    model, checkpoint = load_model(checkpoint_path)
    num_skills = int(checkpoint["num_skills"])
    hidden_dim = int(checkpoint["hidden_dim"])

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

    skill_map = build_skill_map()
    metadata = {
        "numSkills": num_skills,
        "inputDim": 2 * num_skills,
        "hiddenDim": hidden_dim,
        "skills": skill_map["skills"],
        "productCodes": PRODUCT_CODES,
        "amountQuartiles": AMOUNT_QUARTILES,
        "populationFraudRate": POPULATION_FRAUD_RATE,
        "opset": OPSET_VERSION,
    }
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n")

    print(f"Loaded checkpoint from {checkpoint_path}")
    print(f"Exported ONNX model to {model_path}")
    print(f"Wrote metadata to {metadata_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export trained FraudDKT checkpoint to ONNX for the web app."
    )
    parser.add_argument(
        "--checkpoint",
        type=Path,
        default=DEFAULT_CHECKPOINT,
        help=f"PyTorch checkpoint (default: {DEFAULT_CHECKPOINT})",
    )
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
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.checkpoint.exists():
        raise FileNotFoundError(
            f"Checkpoint not found: {args.checkpoint}\n"
            "Run: python fraud_detect/train_dkt.py"
        )
    export_onnx(args.checkpoint, args.output, args.metadata)


if __name__ == "__main__":
    main()
