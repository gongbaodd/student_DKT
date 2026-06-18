#!/usr/bin/env python3
"""Download IEEE-CIS Fraud Detection competition data from Kaggle.

Competition: https://www.kaggle.com/competitions/ieee-fraud-detection

Requires Kaggle credentials in fraud_detect_data/.env (KAGGLE_API_TOKEN) or
~/.kaggle/access_token. Accept the competition rules on Kaggle before downloading.
"""

import argparse
from pathlib import Path

import kagglehub
from dotenv import load_dotenv

DIR = Path(__file__).resolve().parent
load_dotenv(DIR / ".env")
COMPETITION = "ieee-fraud-detection"
DEFAULT_OUTPUT_DIR = DIR / COMPETITION


def download(output_dir: Path = DEFAULT_OUTPUT_DIR) -> Path:
    """Download the latest competition files into output_dir."""
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {COMPETITION}...")
    path = kagglehub.competition_download(COMPETITION, output_dir=str(output_dir))
    print(f"Path to competition files: {path}")
    return Path(path)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download IEEE-CIS Fraud Detection competition data from Kaggle."
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory (default: {DEFAULT_OUTPUT_DIR})",
    )
    args = parser.parse_args()

    path = download(args.output_dir)
    files = sorted(p.name for p in path.iterdir() if p.is_file())
    print(f"Downloaded {len(files)} files:")
    for name in files:
        size_mb = (path / name).stat().st_size / (1024 * 1024)
        print(f"  {name} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
