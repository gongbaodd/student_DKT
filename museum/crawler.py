#!/usr/bin/env python3
"""Crawl museum listings from https://muuseumikaart.ee/ and save to museums.csv."""

import os
import re
import time
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

DIR = Path(__file__).resolve().parent
load_dotenv(DIR / ".env")

API_URL = "https://muuseumikaart.ee/wp-admin/admin-ajax.php"
OUTPUT_FILE = DIR / "museums.csv"

BASE_PAYLOAD = {
    "post_type": "museums",
    "s": "",
    "posts_per_page": "12",
    "total": "133",
    "action": "ama_ajax_museums",
    "is_list": "true",
}

MAX_RETRIES = 3
RETRY_DELAY_SEC = 2
START_PAGE = 1
END_PAGE = 12


def build_headers() -> dict[str, str]:
    cookie = os.getenv("MUSEUM_COOKIE", "").strip()
    if not cookie:
        raise RuntimeError(
            "MUSEUM_COOKIE is not set. From the museum/ directory run:\n"
            "  cp .env.example .env\n"
            "Then edit .env and paste your browser cookie."
        )

    return {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest",
        "Cookie": cookie,
    }


def parse_museum_html(html: str) -> dict | None:
    """Extract museum fields from a single HTML fragment in the API response."""
    museum_id = re.search(r'id="museum-(\d+)"', html)
    name = re.search(
        r'has-semi-large-font-size fw-bold"><a href="[^"]*">([^<]+)</a>', html
    )
    location = re.search(r'museum-location[^>]*>.*?/svg>([^<]+)<', html, re.DOTALL)
    image = re.search(r'<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"', html)
    url = re.search(r'has-semi-large-font-size fw-bold"><a href="([^"]+)"', html)

    if not all([museum_id, name, location, image, url]):
        return None

    return {
        "museum_id": museum_id.group(1),
        "name": name.group(1).strip(),
        "url": url.group(1).strip(),
        "location": location.group(1).strip(),
        "image_url": image.group(1).strip(),
        "image_alt": image.group(2).strip(),
    }


def fetch_page(
    session: requests.Session, page: int, headers: dict[str, str]
) -> list[dict]:
    """Fetch one page with simple retry on network or HTTP errors."""
    payload = {**BASE_PAYLOAD, "paged": str(page)}
    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = session.post(API_URL, headers=headers, data=payload, timeout=30)
            response.raise_for_status()
            body = response.json()
            museums: list[dict] = []

            for html in body.get("data", []):
                parsed = parse_museum_html(html)
                if parsed:
                    parsed["page"] = page
                    museums.append(parsed)

            return museums
        except (requests.RequestException, ValueError) as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SEC)
            else:
                raise RuntimeError(
                    f"Failed to fetch page {page} after {MAX_RETRIES} attempts"
                ) from last_error

    raise RuntimeError(f"Failed to fetch page {page}") from last_error


def crawl_museums() -> pd.DataFrame:
    """Crawl all museum pages and return a merged DataFrame."""
    all_museums: list[dict] = []
    headers = build_headers()

    with requests.Session() as session:
        for page in range(START_PAGE, END_PAGE + 1):
            print(f"Fetching page {page}/{END_PAGE}...")
            museums = fetch_page(session, page, headers)
            all_museums.extend(museums)
            print(f"  Got {len(museums)} museums")

    df = pd.DataFrame(all_museums)
    if not df.empty:
        df = df.drop_duplicates(subset=["museum_id"]).sort_values("museum_id")
    return df


def main() -> None:
    df = crawl_museums()
    df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")
    print(f"Saved {len(df)} museums to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
