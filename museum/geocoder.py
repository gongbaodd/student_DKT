#!/usr/bin/env python3
"""Geocode museum locations with Google Maps API and enrich museums.csv."""

import os
import time
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

DIR = Path(__file__).resolve().parent
load_dotenv(DIR / ".env")

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
INPUT_FILE = DIR / "museums.csv"
OUTPUT_FILE = INPUT_FILE

MAX_RETRIES = 3
RETRY_DELAY_SEC = 2
REQUEST_DELAY_SEC = 0.1

CITY_COMPONENT_TYPES = (
    "locality",
    "postal_town",
    "administrative_area_level_2",
)


def build_api_key() -> str:
    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "GOOGLE_API_KEY is not set. From the museum/ directory run:\n"
            "  cp .env.example .env\n"
            "Then edit .env and add your Google Maps API key."
        )
    return api_key


def extract_city(result: dict) -> str:
    """Pick the most specific city-like name from a geocoding result."""
    components = result.get("address_components", [])
    for component_type in CITY_COMPONENT_TYPES:
        for component in components:
            if component_type in component.get("types", []):
                return component["long_name"]
    return ""


def geocode_address(
    session: requests.Session, address: str, api_key: str
) -> tuple[float | None, float | None, str]:
    """Return latitude, longitude, and city for an address."""
    query = f"{address}, Estonia"
    params = {"address": query, "key": api_key}
    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = session.get(GEOCODE_URL, params=params, timeout=30)
            response.raise_for_status()
            body = response.json()
            status = body.get("status")

            if status == "OK" and body.get("results"):
                result = body["results"][0]
                location = result["geometry"]["location"]
                city = extract_city(result)
                return location["lat"], location["lng"], city

            if status in {"ZERO_RESULTS", "INVALID_REQUEST"}:
                print(f"  No geocoding result for: {address} ({status})")
                return None, None, ""

            if status == "OVER_QUERY_LIMIT":
                raise RuntimeError("Google Geocoding API query limit exceeded")

            print(f"  Geocoding failed for: {address} ({status})")
            return None, None, ""
        except requests.RequestException as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SEC)
            else:
                raise RuntimeError(
                    f"Failed to geocode '{address}' after {MAX_RETRIES} attempts"
                ) from last_error

    raise RuntimeError(f"Failed to geocode '{address}'") from last_error


def needs_geocoding(row: pd.Series) -> bool:
    """Return True when any coordinate or city field is missing."""
    if pd.isna(row.get("latitude")) or pd.isna(row.get("longitude")):
        return True
    city = row.get("city")
    return pd.isna(city) or str(city).strip() == ""


def geocode_museums(df: pd.DataFrame, api_key: str) -> pd.DataFrame:
    """Fill latitude, longitude, and city for rows that need geocoding."""
    if "city" not in df.columns:
        df["city"] = ""
    for field in ("latitude", "longitude"):
        if field not in df.columns:
            df[field] = pd.NA
        else:
            df[field] = pd.to_numeric(df[field], errors="coerce")

    pending = df[df.apply(needs_geocoding, axis=1)]
    total = len(pending)
    if total == 0:
        print("All museums already have coordinates and city.")
        return df

    print(f"Geocoding {total} museums...")
    with requests.Session() as session:
        for index, (_, row) in enumerate(pending.iterrows(), start=1):
            address = str(row["location"]).strip()
            print(f"[{index}/{total}] {row['name']} — {address}")

            lat, lng, city = geocode_address(session, address, api_key)
            df.at[row.name, "latitude"] = lat
            df.at[row.name, "longitude"] = lng
            df.at[row.name, "city"] = city

            if lat is not None and lng is not None:
                print(f"  -> {lat}, {lng} ({city or 'no city'})")

            time.sleep(REQUEST_DELAY_SEC)

    return df


def main() -> None:
    api_key = build_api_key()
    df = pd.read_csv(INPUT_FILE, encoding="utf-8-sig")

    column_order = [
        "museum_id",
        "name",
        "url",
        "location",
        "city",
        "latitude",
        "longitude",
        "image_url",
        "image_alt",
        "page",
    ]
    df = geocode_museums(df, api_key)
    df = df.reindex(columns=column_order)
    df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")
    print(f"Saved {len(df)} museums to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
