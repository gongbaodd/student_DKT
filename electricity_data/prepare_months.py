#!/usr/bin/env python3
"""Extract UCI electricity load data from zip and split into monthly CSV files.

Reads LD2011_2014.txt directly from the zip archive (semicolon-separated, European
decimal commas) and writes one file per month to the output folder.
"""

import argparse
import zipfile
from pathlib import Path

DIR = Path(__file__).resolve().parent
DEFAULT_ZIP = DIR / "electricityloaddiagrams20112014.zip"
DEFAULT_OUTPUT_DIR = DIR / "months"
DATA_FILE = "LD2011_2014.txt"


def month_key(timestamp_field: str) -> str:
    """Return YYYY-MM from a quoted timestamp like \"2011-01-01 00:15:00\"."""
    return timestamp_field.strip('"')[:7]


def split_by_month(zip_path: Path, output_dir: Path) -> list[tuple[Path, int]]:
    """Stream the dataset from zip and write one CSV per calendar month."""
    output_dir.mkdir(parents=True, exist_ok=True)

    counts: dict[str, int] = {}
    current_month: str | None = None
    current_file = None

    with zipfile.ZipFile(zip_path) as zf:
        if DATA_FILE not in zf.namelist():
            raise FileNotFoundError(f"{DATA_FILE!r} not found in {zip_path}")

        with zf.open(DATA_FILE) as raw:
            header = raw.readline().decode("utf-8")

            for raw_line in raw:
                line = raw_line.decode("utf-8")
                month = month_key(line.split(";", 1)[0])

                if month != current_month:
                    if current_file is not None:
                        current_file.close()
                    current_month = month
                    path = output_dir / f"{month}.csv"
                    current_file = path.open("w", encoding="utf-8", newline="")
                    current_file.write(header)
                    counts.setdefault(month, 0)

                current_file.write(line)
                counts[month] += 1

    if current_file is not None:
        current_file.close()

    return [
        (output_dir / f"{month}.csv", row_count)
        for month, row_count in sorted(counts.items())
    ]


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Unzip electricityloaddiagrams20112014.zip and split "
            "LD2011_2014.txt into monthly CSV files."
        )
    )
    parser.add_argument(
        "--zip",
        type=Path,
        default=DEFAULT_ZIP,
        help=f"Input zip archive (default: {DEFAULT_ZIP})",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output folder for monthly CSVs (default: {DEFAULT_OUTPUT_DIR})",
    )
    args = parser.parse_args()

    if not args.zip.is_file():
        raise SystemExit(f"Zip not found: {args.zip} (run download.py first)")

    print(f"Splitting {args.zip.name} -> {args.output_dir}")
    outputs = split_by_month(args.zip, args.output_dir)
    total_rows = sum(row_count for _, row_count in outputs)

    print(f"Wrote {total_rows:,} rows across {len(outputs)} months in {args.output_dir}")
    for path, row_count in outputs:
        print(f"  {path.name}: {row_count:,} rows")


if __name__ == "__main__":
    main()
