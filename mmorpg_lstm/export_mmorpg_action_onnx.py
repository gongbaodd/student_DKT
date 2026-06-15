#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

import torch

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

_MODEL_PATH = Path(__file__).resolve().parent / "mmorpg_action_model.py"
_model_spec = importlib.util.spec_from_file_location("mmorpg_action_model", _MODEL_PATH)
assert _model_spec and _model_spec.loader
_action_model = importlib.util.module_from_spec(_model_spec)
_model_spec.loader.exec_module(_action_model)

train_next_action = _action_model.train_next_action

_GENERATOR_PATH = Path(__file__).resolve().parent / "mmorpg_action_generator.py"
_gen_spec = importlib.util.spec_from_file_location("mmorpg_action_generator", _GENERATOR_PATH)
assert _gen_spec and _gen_spec.loader
_generator = importlib.util.module_from_spec(_gen_spec)
_gen_spec.loader.exec_module(_generator)

ACTIONS = _generator.ACTIONS
populate_data = _generator.populate_data

DEFAULT_OUTPUT = Path("mmorpg_three/public/next-action.onnx")
DEFAULT_METADATA = Path("mmorpg_three/public/model-metadata.json")
LEGACY_OUTPUT = Path("mmorpg_three/public/dkt.onnx")
OPSET_VERSION = 17
HIDDEN_DIM = 50


def export_onnx(
    model_path: Path,
    metadata_path: Path,
    *,
    seed: int = 42,
    verbose: bool = True,
) -> None:
    num_actions = len(ACTIONS)
    data = populate_data(seed)
    model, _ = train_next_action(
        data,
        num_actions,
        hidden_dim=HIDDEN_DIM,
        seed=seed,
        verbose=verbose,
    )

    model.eval()
    model_path.parent.mkdir(parents=True, exist_ok=True)

    dummy = torch.randn(1, 10, num_actions)
    with torch.no_grad():
        torch.onnx.export(
            model,
            dummy,
            model_path,
            input_names=["actions"],
            output_names=["predictions"],
            dynamic_axes={
                "actions": {0: "batch", 1: "seq"},
                "predictions": {0: "batch", 1: "seq"},
            },
            opset_version=OPSET_VERSION,
            dynamo=False,
        )

    metadata = {
        "modelType": "next-action-lstm",
        "numActions": num_actions,
        "inputDim": num_actions,
        "hiddenDim": HIDDEN_DIM,
        "actions": ACTIONS,
        "opset": OPSET_VERSION,
    }
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n")

    if LEGACY_OUTPUT.exists():
        LEGACY_OUTPUT.unlink()

    print(f"\nExported ONNX model to {model_path}")
    print(f"Wrote metadata to {metadata_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train MMORPG next-action LSTM and export to ONNX."
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--metadata", type=Path, default=DEFAULT_METADATA)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    export_onnx(args.output, args.metadata, seed=args.seed)


if __name__ == "__main__":
    main()
