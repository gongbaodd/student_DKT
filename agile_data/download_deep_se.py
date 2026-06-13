#!/usr/bin/env python3
"""Download giseldo/deep-se from Hugging Face and save as CSV per project.

Dataset: User stories with story points from Choetkiertikul et al.,
"A deep learning model for estimating story points," IEEE TSE, 2019.

Columns: project, issuekey, title, description, storypoint
"""

import argparse
import re
from pathlib import Path

import pandas as pd
from datasets import load_dataset

DIR = Path(__file__).resolve().parent
DATASET_ID = "giseldo/deep-se"
DEFAULT_OUTPUT_DIR = DIR / "deep-se"
EXPECTED_COLUMNS = ("project", "issuekey", "title", "description", "storypoint")


def sanitize_project_name(project: str) -> str:
    """Make project keys safe for use as filenames."""
    return re.sub(r"[^\w.-]+", "_", project).strip("_") or "unknown"


def download_deep_se(
    df: pd.DataFrame, output_dir: Path = DEFAULT_OUTPUT_DIR
) -> list[tuple[Path, int]]:
    """Export one CSV per project from the loaded dataframe."""
    output_dir.mkdir(parents=True, exist_ok=True)

    written: list[tuple[Path, int]] = []
    for project, group in df.groupby("project", sort=True):
        path = output_dir / f"{sanitize_project_name(str(project))}.csv"
        group.to_csv(path, index=False, encoding="utf-8-sig")
        written.append((path, len(group)))
    return written


def validate_outputs(paths: list[Path], expected_rows: int) -> None:
    """Verify column schema and total row count across all project files."""
    total_rows = 0
    for path in paths:
        df = pd.read_csv(path, encoding="utf-8-sig")
        columns = tuple(df.columns)
        if columns != EXPECTED_COLUMNS:
            raise RuntimeError(
                f"{path.name}: unexpected columns {columns!r} "
                f"(expected {EXPECTED_COLUMNS!r})"
            )
        total_rows += len(df)

    if total_rows != expected_rows:
        raise RuntimeError(
            f"Row count mismatch: wrote {total_rows:,} rows, expected {expected_rows:,}"
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download giseldo/deep-se from Hugging Face to CSV (one file per project)."
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory for project CSVs (default: {DEFAULT_OUTPUT_DIR})",
    )
    args = parser.parse_args()

    print(f"Downloading {DATASET_ID}...")
    ds = load_dataset(DATASET_ID, split="train")
    df = ds.to_pandas()
    expected_rows = len(df)

    outputs = download_deep_se(df, args.output_dir)
    paths = [path for path, _ in outputs]
    validate_outputs(paths, expected_rows)

    print(f"Saved {expected_rows:,} rows across {len(outputs)} projects in {args.output_dir}")
    for path, row_count in outputs:
        print(f"  {path.name}: {row_count:,} rows")
    print(f"Columns: {', '.join(EXPECTED_COLUMNS)}")


if __name__ == "__main__":
    main()
