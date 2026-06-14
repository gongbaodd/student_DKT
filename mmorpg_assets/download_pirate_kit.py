#!/usr/bin/env python3
"""Download Kenney Pirate Kit assets and extract to a local folder.

Source: https://kenney.nl/assets/pirate-kit
License: CC0 (see Kenney asset page).
"""

import argparse
import urllib.request
import zipfile
from pathlib import Path

DIR = Path(__file__).resolve().parent
URL = (
    "https://kenney.nl/media/pages/assets/pirate-kit/"
    "e6d4bb1525-1771333093/kenney_pirate-kit.zip"
)
DEFAULT_ZIP = DIR / "kenney_pirate-kit.zip"
DEFAULT_OUTPUT_DIR = DIR / "pirate-kit"


def download(url: str, dest: Path) -> Path:
    """Download a file to dest, creating parent directories as needed."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {url}")
    print(f"  -> {dest}")
    urllib.request.urlretrieve(url, dest)
    return dest


def unzip(archive: Path, output_dir: Path) -> Path:
    """Extract zip archive into output_dir."""
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Extracting {archive.name}")
    print(f"  -> {output_dir}")
    with zipfile.ZipFile(archive, "r") as zf:
        zf.extractall(output_dir)
    return output_dir


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download Kenney Pirate Kit zip and extract assets."
    )
    parser.add_argument(
        "--zip",
        type=Path,
        default=DEFAULT_ZIP,
        help=f"Downloaded zip path (default: {DEFAULT_ZIP})",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Extraction directory (default: {DEFAULT_OUTPUT_DIR})",
    )
    parser.add_argument(
        "--skip-download",
        action="store_true",
        help="Only extract an existing zip file",
    )
    args = parser.parse_args()

    if not args.skip_download:
        download(URL, args.zip)
        size_mb = args.zip.stat().st_size / (1024 * 1024)
        print(f"Saved {args.zip.name} ({size_mb:.1f} MB)")
    elif not args.zip.is_file():
        raise SystemExit(f"Zip not found: {args.zip}")

    output_dir = unzip(args.zip, args.output_dir)
    file_count = sum(1 for path in output_dir.rglob("*") if path.is_file())
    print(f"Extracted {file_count:,} files to {output_dir}")


if __name__ == "__main__":
    main()
