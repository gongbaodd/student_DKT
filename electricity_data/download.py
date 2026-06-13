#!/usr/bin/env python3
"""Download UCI ElectricityLoadDiagrams20112014 dataset.

Dataset: household electricity consumption (kW) at 1-minute intervals,
2011-2014. Source: UCI ML Repository, dataset ID 321.
"""

import argparse
import urllib.request
from pathlib import Path

DIR = Path(__file__).resolve().parent
URL = (
    "https://archive.ics.uci.edu/static/public/321/"
    "electricityloaddiagrams20112014.zip"
)
DEFAULT_OUTPUT = DIR / "electricityloaddiagrams20112014.zip"


def download(url: str, dest: Path) -> Path:
    """Download a file to dest, creating parent directories as needed."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {url}")
    print(f"  -> {dest}")
    urllib.request.urlretrieve(url, dest)
    return dest


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download UCI ElectricityLoadDiagrams20112014 zip archive."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output zip path (default: {DEFAULT_OUTPUT})",
    )
    args = parser.parse_args()

    path = download(URL, args.output)
    size_mb = path.stat().st_size / (1024 * 1024)
    print(f"Saved {path.name} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
