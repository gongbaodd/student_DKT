"""Synthetic DKT training data for electricity buy/hold/sell decisions.

Oracle and price-stratified sampling mirror electricity_web/src/utils/dktOracle.ts
and dktSampling.ts.
"""

from __future__ import annotations

import argparse
import csv
import random
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

SKILLS = ["Buy", "Hold", "Sell"]
BUY, HOLD, SELL = 0, 1, 2

BATTERY_CAPACITY = 100
DEFAULT_TRADE_AMOUNT = 25
PRICE_PERCENTILES = (0.125, 0.375, 0.625, 0.875)

NUM_STUDENTS = 200
LEARN_RATE = 0.15
SLIP_RATE = 0.10
MASTERY_MIN = 0.05
MASTERY_MAX = 0.95
MASTERY_SAMPLE_MIN = 0.2
MASTERY_SAMPLE_MAX = 0.8

DEFAULT_SEED = 42
DEFAULT_OUTPUT = Path("data/electricity_dkt_train.csv")
LOAD_FILE = Path("electricity_data/months/2014-06.csv")
MONTH = "2014-06"


@dataclass(frozen=True)
class PriceRow:
    index: int
    day: str
    load_kw: float


def load_june_rows(path: Path = LOAD_FILE) -> list[PriceRow]:
    df = pd.read_csv(
        path,
        sep=";",
        decimal=",",
        quotechar='"',
        parse_dates=[0],
        index_col=0,
    )
    usage = df.sum(axis=1).sort_index()
    rows: list[PriceRow] = []
    for index, (ts, load_kw) in enumerate(usage.items()):
        rows.append(PriceRow(index=index, day=ts.strftime("%Y-%m-%d"), load_kw=float(load_kw)))
    return rows


def build_day_price_ranks(rows: list[PriceRow]) -> dict[int, float]:
    by_day: dict[str, list[tuple[int, float]]] = defaultdict(list)
    for row in rows:
        by_day[row.day].append((row.index, row.load_kw))

    ranks: dict[int, float] = {}
    for day_rows in by_day.values():
        sorted_rows = sorted(day_rows, key=lambda item: item[1])
        count = len(sorted_rows)
        if count == 1:
            ranks[sorted_rows[0][0]] = 0.5
            continue
        for rank, (index, _) in enumerate(sorted_rows):
            ranks[index] = rank / (count - 1)
    return ranks


def build_dkt_sample_indices(rows: list[PriceRow]) -> list[int]:
    by_day: dict[str, list[tuple[int, float]]] = defaultdict(list)
    for row in rows:
        by_day[row.day].append((row.index, row.load_kw))

    indices: list[int] = []
    for day in sorted(by_day.keys()):
        day_rows = sorted(by_day[day], key=lambda item: item[1])
        count = len(day_rows)
        if count == 0:
            continue
        for percentile in PRICE_PERCENTILES:
            position = min(max(int(round(percentile * (count - 1))), 0), count - 1)
            indices.append(day_rows[position][0])
    return sorted(indices)


def oracle_action(charge: int, price_rank: float, amount_step: int = DEFAULT_TRADE_AMOUNT) -> str:
    if charge == 0 and price_rank <= 0.25:
        return "buy"
    if charge >= amount_step and price_rank >= 0.75:
        return "sell"
    return "hold"


def action_to_skill_id(action: str) -> int:
    if action == "buy":
        return BUY
    if action == "sell":
        return SELL
    return HOLD


def valid_actions(
    charge: int,
    amount_step: int = DEFAULT_TRADE_AMOUNT,
    capacity: int = BATTERY_CAPACITY,
) -> list[str]:
    actions = ["hold"]
    if charge + amount_step <= capacity:
        actions.append("buy")
    if charge >= amount_step:
        actions.append("sell")
    return actions


def apply_action(charge: int, action: str, amount_step: int = DEFAULT_TRADE_AMOUNT) -> int:
    if action == "buy":
        return charge + amount_step
    if action == "sell":
        return charge - amount_step
    return charge


def sample_initial_mastery(rng: random.Random) -> dict[str, float]:
    return {
        skill: rng.uniform(MASTERY_SAMPLE_MIN, MASTERY_SAMPLE_MAX) for skill in SKILLS
    }


def update_mastery(mastery: dict[str, float], skill: str, correct: int) -> None:
    if correct:
        mastery[skill] += LEARN_RATE * (1 - mastery[skill])
    else:
        mastery[skill] -= SLIP_RATE * mastery[skill]
    mastery[skill] = max(MASTERY_MIN, min(MASTERY_MAX, mastery[skill]))


def pick_student_action(
    oracle: str,
    charge: int,
    mastery: dict[str, float],
    rng: random.Random,
    amount_step: int = DEFAULT_TRADE_AMOUNT,
) -> str:
    oracle_skill = SKILLS[action_to_skill_id(oracle)]
    allowed = valid_actions(charge, amount_step)
    if rng.random() < mastery[oracle_skill] and oracle in allowed:
        return oracle

    alternatives = [action for action in allowed if action != oracle]
    if not alternatives:
        return oracle if oracle in allowed else "hold"
    return rng.choice(alternatives)


def generate_student_sequence(
    student_id: int,
    rows: list[PriceRow],
    price_ranks: dict[int, float],
    sample_indices: list[int],
    rng: random.Random,
) -> list[tuple[int, int, int]]:
    mastery = sample_initial_mastery(rng)
    interactions: list[tuple[int, int, int]] = []
    charge = 0

    for index in sample_indices:
        row = rows[index]
        price_rank = price_ranks[index]
        optimal = oracle_action(charge, price_rank)
        action = pick_student_action(optimal, charge, mastery, rng)
        skill_id = action_to_skill_id(action)
        correct = 1 if action == optimal else 0
        interactions.append((student_id, skill_id, correct))
        charge = apply_action(charge, action)
        update_mastery(mastery, SKILLS[skill_id], correct)

    return interactions


def populate_data(seed: int = DEFAULT_SEED) -> list[tuple[int, int, int]]:
    rows = load_june_rows()
    price_ranks = build_day_price_ranks(rows)
    sample_indices = build_dkt_sample_indices(rows)
    rng = random.Random(seed)

    all_rows: list[tuple[int, int, int]] = []
    for student_id in range(NUM_STUDENTS):
        all_rows.extend(
            generate_student_sequence(student_id, rows, price_ranks, sample_indices, rng)
        )
    return all_rows


def write_dataset(path: Path, rows: list[tuple[int, int, int]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["user_id", "skill_id", "correct"])
        writer.writerows(rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate synthetic DKT training data for electricity trading."
    )
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = populate_data(args.seed)
    write_dataset(args.output, rows)
    sample_count = len(build_dkt_sample_indices(load_june_rows()))
    print(f"Skills: {len(SKILLS)} ({', '.join(SKILLS)})")
    print(f"Month: {MONTH}")
    print(f"DKT sample points per student: {sample_count}")
    print(f"Students: {NUM_STUDENTS}")
    print(f"Total interactions: {len(rows)}")
    print(f"Wrote dataset to {args.output}")


if __name__ == "__main__":
    main()
