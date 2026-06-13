#!/usr/bin/env python3
"""Download hourly Lisbon temperature for 2014 from Open-Meteo archive API."""

import argparse
import json
import urllib.parse
import urllib.request
from pathlib import Path

DIR = Path(__file__).resolve().parent
LISBON_LAT = 38.7223
LISBON_LON = -9.1393
DEFAULT_OUTPUT = DIR / "lisbon_temperature_2014.csv"
API_URL = "https://archive-api.open-meteo.com/v1/archive"


def fetch_temperature(start_date: str, end_date: str) -> dict:
    params = urllib.parse.urlencode(
        {
            "latitude": LISBON_LAT,
            "longitude": LISBON_LON,
            "start_date": start_date,
            "end_date": end_date,
            "hourly": "temperature_2m",
            "timezone": "Europe/Lisbon",
        }
    )
    url = f"{API_URL}?{params}"
    print(f"Fetching {url}")
    with urllib.request.urlopen(url) as response:
        return json.load(response)


def save_hourly_csv(payload: dict, dest: Path) -> int:
    hourly = payload["hourly"]
    times = hourly["time"]
    temps = hourly["temperature_2m"]

    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", encoding="utf-8", newline="") as file:
        file.write("timestamp,temperature_c\n")
        for timestamp, temperature in zip(times, temps):
            file.write(f"{timestamp},{temperature}\n")
    return len(times)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download hourly Lisbon 2 m temperature for 2014."
    )
    parser.add_argument(
        "--start-date",
        default="2014-01-01",
        help="Start date (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--end-date",
        default="2014-12-31",
        help="End date (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output CSV path (default: {DEFAULT_OUTPUT})",
    )
    args = parser.parse_args()

    payload = fetch_temperature(args.start_date, args.end_date)
    row_count = save_hourly_csv(payload, args.output)
    print(f"Saved {row_count:,} hourly rows to {args.output}")


if __name__ == "__main__":
    main()
