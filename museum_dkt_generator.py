import argparse
import csv
import random
from pathlib import Path

CLUSTER_NAMES_CSV = Path("museum/cluster_names.csv")

NUM_STUDENTS = 200
INTERACTIONS_PER_STUDENT = 30

LEARN_RATE = 0.15
SLIP_RATE = 0.10
MASTERY_MIN = 0.05
MASTERY_MAX = 0.95
MASTERY_SAMPLE_MIN = 0.2
MASTERY_SAMPLE_MAX = 0.8

DEFAULT_SEED = 42
DEFAULT_OUTPUT = Path("data/museum_dkt_train.csv")


def load_skills(path: Path) -> list[str]:
    skills: list[str] = []
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            skills.append(row["cluster_name"])
    return skills


SKILLS = load_skills(CLUSTER_NAMES_CSV)


def sample_initial_mastery(rng: random.Random) -> dict[str, float]:
    return {
        skill: rng.uniform(MASTERY_SAMPLE_MIN, MASTERY_SAMPLE_MAX)
        for skill in SKILLS
    }


def update_mastery(mastery: dict[str, float], skill: str, correct: int) -> None:
    if correct:
        mastery[skill] += LEARN_RATE * (1 - mastery[skill])
    else:
        mastery[skill] -= SLIP_RATE * mastery[skill]
    mastery[skill] = max(MASTERY_MIN, min(MASTERY_MAX, mastery[skill]))


def generate_student_sequence(
    student_id: int, rng: random.Random
) -> list[tuple[int, int, int]]:
    mastery = sample_initial_mastery(rng)
    rows: list[tuple[int, int, int]] = []

    for _ in range(INTERACTIONS_PER_STUDENT):
        skill_id = rng.randrange(len(SKILLS))
        skill = SKILLS[skill_id]
        correct = 1 if rng.random() < mastery[skill] else 0
        rows.append((student_id, skill_id, correct))
        update_mastery(mastery, skill, correct)

    return rows


def populate_data(seed: int = DEFAULT_SEED) -> list[tuple[int, int, int]]:
    rng = random.Random(seed)
    rows: list[tuple[int, int, int]] = []
    for student_id in range(NUM_STUDENTS):
        rows.extend(generate_student_sequence(student_id, rng))
    return rows


def write_dataset(path: Path, rows: list[tuple[int, int, int]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["user_id", "skill_id", "correct"])
        writer.writerows(rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate synthetic DKT training data for museum clusters."
    )
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = populate_data(args.seed)
    write_dataset(args.output, rows)
    print(f"Skills: {len(SKILLS)}")
    print(f"Students: {NUM_STUDENTS}")
    print(f"Total interactions: {len(rows)}")
    print(f"Wrote dataset to {args.output}")


if __name__ == "__main__":
    main()
