import argparse
import csv
import random
from pathlib import Path

ACTIONS = ["Kill", "WalkAround", "AskForQuest", "Talk"]
NUM_PLAYERS = 200
INTERACTIONS_PER_PLAYER = 30

DEFAULT_SEED = 42
DEFAULT_OUTPUT = Path("mmorpg_lstm/data/mmorpg_action_train.csv")

# Markov boosts: after action i, increase weight for action j
TRANSITION_BOOSTS: dict[int, dict[int, float]] = {
    2: {3: 0.2},  # Talk -> AskForQuest
    3: {2: 0.15},  # AskForQuest -> Talk
    1: {0: 0.1},  # WalkAround -> Kill
}


def sample_player_weights(rng: random.Random) -> list[float]:
    raw = [rng.gammavariate(2.0, 1.0) for _ in ACTIONS]
    total = sum(raw)
    return [value / total for value in raw]


def apply_transition_boost(
    base_weights: list[float],
    previous_action: int | None,
) -> list[float]:
    if previous_action is None:
        return base_weights

    boosted = list(base_weights)
    for target, boost in TRANSITION_BOOSTS.get(previous_action, {}).items():
        boosted[target] += boost

    total = sum(boosted)
    return [value / total for value in boosted]


def generate_player_sequence(
    player_id: int,
    rng: random.Random,
) -> list[tuple[int, int]]:
    base_weights = sample_player_weights(rng)
    rows: list[tuple[int, int]] = []
    previous_action: int | None = None

    for _ in range(INTERACTIONS_PER_PLAYER):
        weights = apply_transition_boost(base_weights, previous_action)
        action_id = rng.choices(range(len(ACTIONS)), weights=weights, k=1)[0]
        rows.append((player_id, action_id))
        previous_action = action_id

    return rows


def populate_data(seed: int = DEFAULT_SEED) -> list[tuple[int, int]]:
    rng = random.Random(seed)
    rows: list[tuple[int, int]] = []
    for player_id in range(NUM_PLAYERS):
        rows.extend(generate_player_sequence(player_id, rng))
    return rows


def write_dataset(path: Path, rows: list[tuple[int, int]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["user_id", "action_id"])
        writer.writerows(rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate synthetic next-action training data for MMORPG NPC menus."
    )
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = populate_data(args.seed)
    write_dataset(args.output, rows)
    print(f"Actions: {len(ACTIONS)}")
    print(f"Players: {NUM_PLAYERS}")
    print(f"Total interactions: {len(rows)}")
    print(f"Wrote dataset to {args.output}")


if __name__ == "__main__":
    main()
