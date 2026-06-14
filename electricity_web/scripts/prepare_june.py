#!/usr/bin/env python3
"""Convert electricity_data CSVs to slim JSON for electricity_web (June 2014)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "electricity_data"
MONTH = "2014-06"
LOAD_FILE = DATA_DIR / "months" / f"{MONTH}.csv"
TEMP_FILE = DATA_DIR / "lisbon_temperature_2014.csv"
OUT_DIR = Path(__file__).resolve().parents[1] / "public"
OUT_FILE = OUT_DIR / f"{MONTH}.json"


def main() -> None:
    try:
        import holidays
        import pandas as pd
    except ImportError as exc:
        raise SystemExit(
            "Missing dependencies. Install with: pip install pandas holidays"
        ) from exc

    if not LOAD_FILE.is_file():
        raise SystemExit(
            f"Missing {LOAD_FILE}. Run electricity_data/prepare_months.py first."
        )
    if not TEMP_FILE.is_file():
        raise SystemExit(
            f"Missing {TEMP_FILE}. Run electricity_data/download_lisbon_weather.py first."
        )

    df = pd.read_csv(
        LOAD_FILE,
        sep=";",
        decimal=",",
        quotechar='"',
        parse_dates=[0],
        index_col=0,
    )
    usage = df.sum(axis=1).sort_index()

    temperature_hourly = pd.read_csv(
        TEMP_FILE,
        parse_dates=["timestamp"],
        index_col="timestamp",
    )["temperature_c"].sort_index()

    temperature = (
        temperature_hourly.reindex(usage.index.union(temperature_hourly.index))
        .sort_index()
        .interpolate("time")
        .loc[usage.index]
    )

    portugal_holidays = holidays.Portugal(years=2014)
    visible_days = usage.index.normalize().unique()
    holiday_rows = [
        {"date": day.strftime("%Y-%m-%d"), "name": portugal_holidays[day.date()]}
        for day in visible_days
        if day.date() in portugal_holidays
    ]

    points = [
        {
            "t": ts.strftime("%Y-%m-%dT%H:%M:%S"),
            "loadKw": round(float(load), 1),
            "tempC": round(float(temp), 1),
        }
        for ts, load, temp in zip(usage.index, usage.values, temperature.values)
    ]

    payload = {
        "month": MONTH,
        "intervalMinutes": 15,
        "stats": {
            "loadMin": round(float(usage.min()), 1),
            "loadMean": round(float(usage.mean()), 1),
            "loadMax": round(float(usage.max()), 1),
            "tempMin": round(float(temperature.min()), 1),
            "tempMean": round(float(temperature.mean()), 1),
            "tempMax": round(float(temperature.max()), 1),
        },
        "holidays": holiday_rows,
        "points": points,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(points):,} points to {OUT_FILE}")


if __name__ == "__main__":
    main()
