import argparse
import csv
import random
from pathlib import Path

SKILLS = ["Addition", "Subtraction", "Multiplication"]
NUM_STUDENTS = 100
INTERACTIONS_PER_STUDENT = 20

LEARN_RATE = 0.15
SLIP_RATE = 0.10
MASTERY_MIN = 0.05
MASTERY_MAX = 0.95
MASTERY_SAMPLE_MIN = 0.2
MASTERY_SAMPLE_MAX = 0.8

DEFAULT_SEED = 42
DEFAULT_OUTPUT = Path("data/dkt_train.csv")
DEFAULT_SKILLS_OUTPUT = Path("data/skills.csv")


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


def write_dataset(path: Path, rows: list[tuple[int, int, int]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["user_id", "skill_id", "correct"])
        writer.writerows(rows)


def write_skills(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["skill_id", "skill_name"])
        for skill_id, skill_name in enumerate(SKILLS):
            writer.writerow([skill_id, skill_name])


def verify_dataset(rows: list[tuple[int, int, int]]) -> None:
    student_counts: dict[int, int] = {}
    skill_counts: dict[int, int] = {0: 0, 1: 0, 2: 0}
    correct_count = 0

    for user_id, skill_id, correct in rows:
        if skill_id not in {0, 1, 2}:
            raise ValueError(f"Invalid skill_id: {skill_id}")
        if correct not in {0, 1}:
            raise ValueError(f"Invalid correct value: {correct}")
        student_counts[user_id] = student_counts.get(user_id, 0) + 1
        skill_counts[skill_id] += 1
        correct_count += correct

    if len(student_counts) != NUM_STUDENTS:
        raise ValueError(f"Expected {NUM_STUDENTS} students, got {len(student_counts)}")

    for user_id, count in student_counts.items():
        if count != INTERACTIONS_PER_STUDENT:
            raise ValueError(
                f"Student {user_id} has {count} interactions, "
                f"expected {INTERACTIONS_PER_STUDENT}"
            )

    accuracy = correct_count / len(rows) if rows else 0.0
    print(f"Students: {NUM_STUDENTS}")
    print(f"Total interactions: {len(rows)}")
    print(f"Interactions per student: {INTERACTIONS_PER_STUDENT}")
    print("Per-skill attempts:")
    for skill_id, count in skill_counts.items():
        print(f"  {skill_id} ({SKILLS[skill_id]}): {count}")
    print(f"Overall accuracy: {accuracy:.1%}")

    print("\nFirst student sequence (user_id=0):")
    first_student = [row for row in rows if row[0] == 0]
    for user_id, skill_id, correct in first_student:
        print(f"  skill={SKILLS[skill_id]} ({skill_id}), correct={correct}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a minimal synthetic DKT training dataset."
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=DEFAULT_SEED,
        help=f"RNG seed for reproducibility (default: {DEFAULT_SEED})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output CSV path (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--skills-output",
        type=Path,
        default=DEFAULT_SKILLS_OUTPUT,
        help=f"Skills mapping CSV path (default: {DEFAULT_SKILLS_OUTPUT})",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rng = random.Random(args.seed)

    rows: list[tuple[int, int, int]] = []
    for student_id in range(NUM_STUDENTS):
        rows.extend(generate_student_sequence(student_id, rng))

    write_dataset(args.output, rows)
    write_skills(args.skills_output)
    verify_dataset(rows)

    print(f"\nWrote dataset to {args.output}")
    print(f"Wrote skills mapping to {args.skills_output}")


if __name__ == "__main__":
    main()
