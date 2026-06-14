#!/usr/bin/env python3
"""Copy Kenney pirate-kit GLBs into mmorpg_godot/assets/models/."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT.parent / "mmorpg_assets" / "pirate-kit" / "Models" / "GLB format"
DEST_DIR = ROOT / "assets" / "models"
TEXTURE_DEST = DEST_DIR / "Textures"

MODELS = [
    "boat-row-small",
    "boat-row-large",
    "ship-small",
    "ship-medium",
    "ship-large",
    "ship-pirate-small",
    "ship-pirate-medium",
    "ship-pirate-large",
]


def main() -> int:
    if not SOURCE_DIR.is_dir():
        print(f"Asset source not found: {SOURCE_DIR}", file=sys.stderr)
        print("Run: python mmorpg_assets/download_pirate_kit.py", file=sys.stderr)
        return 1

    TEXTURE_DEST.mkdir(parents=True, exist_ok=True)

    colormap_src = SOURCE_DIR / "Textures" / "colormap.png"
    colormap_dest = TEXTURE_DEST / "colormap.png"
    if not colormap_src.is_file():
        print(f"Missing texture: {colormap_src}", file=sys.stderr)
        return 1
    shutil.copy2(colormap_src, colormap_dest)

    copied = 0
    for name in MODELS:
        src = SOURCE_DIR / f"{name}.glb"
        dest = DEST_DIR / f"{name}.glb"
        if not src.is_file():
            print(f"Missing model: {src}", file=sys.stderr)
            return 1
        shutil.copy2(src, dest)
        copied += 1

    print(f"Prepared {copied} models + colormap -> {DEST_DIR}")
    print("Open the project in Godot once (or run: godot --headless --path . --import) to import GLBs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
