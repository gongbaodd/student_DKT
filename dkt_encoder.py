import argparse
import csv
from pathlib import Path

DEFAULT_INPUT = Path("data/dkt_train.csv")
DEFAULT_OUTPUT = Path("data/dkt_train_vectors.csv")
DEFAULT_NUM_SKILLS = 3


def feature_names(num_skills: int = DEFAULT_NUM_SKILLS) -> list[str]:
    correct = [f"skill{i}_correct" for i in range(num_skills)]
    wrong = [f"skill{i}_wrong" for i in range(num_skills)]
    return correct + wrong


def encode_interaction(
    skill_id: int, correct: int, num_skills: int = DEFAULT_NUM_SKILLS
) -> list[int]:
    if skill_id < 0 or skill_id >= num_skills:
        raise ValueError(f"skill_id must be in [0, {num_skills}), got {skill_id}")
    if correct not in {0, 1}:
        raise ValueError(f"correct must be 0 or 1, got {correct}")

    vector = [0] * (2 * num_skills)
    index = skill_id if correct else num_skills + skill_id
    vector[index] = 1
    return vector


def load_interactions(path: Path) -> list[tuple[int, int, int]]:
    rows: list[tuple[int, int, int]] = []
    with path.open(newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(
                (int(row["user_id"]), int(row["skill_id"]), int(row["correct"]))
            )
    return rows


def encode_dataset(
    path: Path, num_skills: int = DEFAULT_NUM_SKILLS
) -> list[tuple[int, list[int]]]:
    return [
        (user_id, encode_interaction(skill_id, correct, num_skills))
        for user_id, skill_id, correct in load_interactions(path)
    ]


def write_encoded_dataset(
    path: Path,
    encoded: list[tuple[int, list[int]]],
    num_skills: int = DEFAULT_NUM_SKILLS,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    names = feature_names(num_skills)
    with path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["user_id", *names])
        for user_id, vector in encoded:
            writer.writerow([user_id, *vector])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Encode DKT interactions into skill correct/wrong vectors."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_INPUT,
        help=f"Input CSV path (default: {DEFAULT_INPUT})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output CSV path (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--num-skills",
        type=int,
        default=DEFAULT_NUM_SKILLS,
        help=f"Number of skills (default: {DEFAULT_NUM_SKILLS})",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    encoded = encode_dataset(args.input, args.num_skills)
    write_encoded_dataset(args.output, encoded, args.num_skills)

    names = feature_names(args.num_skills)
    print(f"Encoded {len(encoded)} interactions into {len(names)}-dim vectors")
    print(f"Feature order: {names}")

    print("\nFirst 5 rows:")
    for user_id, vector in encoded[:5]:
        print(f"  user_id={user_id}, vector={vector}")

    print(f"\nWrote encoded dataset to {args.output}")


if __name__ == "__main__":
    main()
