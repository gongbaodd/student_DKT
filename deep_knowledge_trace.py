import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium")


@app.cell
def _():
    import random

    from dkt_generator import (
        INTERACTIONS_PER_STUDENT,
        NUM_STUDENTS,
        SKILLS,
        generate_student_sequence,
    )

    def populate_data(seed: int = 42) -> list[tuple[int, int, int]]:
        rng = random.Random(seed)
        rows: list[tuple[int, int, int]] = []
        for student_id in range(NUM_STUDENTS):
            rows.extend(generate_student_sequence(student_id, rng))
        return rows

    return INTERACTIONS_PER_STUDENT, NUM_STUDENTS, SKILLS, populate_data


@app.cell
def _(INTERACTIONS_PER_STUDENT, NUM_STUDENTS, SKILLS, populate_data):
    data = populate_data()

    student_counts: dict[int, int] = {}
    skill_counts: dict[int, int] = {0: 0, 1: 0, 2: 0}
    correct_count = 0

    for user_id, skill_id, correct in data:
        student_counts[user_id] = student_counts.get(user_id, 0) + 1
        skill_counts[skill_id] += 1
        correct_count += correct

    accuracy = correct_count / len(data)

    print(f"Students: {len(student_counts)}")
    print(f"Total interactions: {len(data)}")
    print(f"Interactions per student: {INTERACTIONS_PER_STUDENT}")
    print("Per-skill attempts:")
    for skill_id, count in skill_counts.items():
        print(f"  {skill_id} ({SKILLS[skill_id]}): {count}")
    print(f"Overall accuracy: {accuracy:.1%}")

    print("\nFirst student sequence (user_id=0):")
    for user_id, skill_id, correct in data[:INTERACTIONS_PER_STUDENT]:
        print(f"  skill={SKILLS[skill_id]} ({skill_id}), correct={correct}")

    assert len(data) == NUM_STUDENTS * INTERACTIONS_PER_STUDENT
    assert len(student_counts) == NUM_STUDENTS
    assert all(count == INTERACTIONS_PER_STUDENT for count in student_counts.values())
    return (data,)


@app.cell
def _(SKILLS, data):
    from dkt_encoder import encode_interaction, feature_names

    num_skills = len(SKILLS)
    encoded_data = [
        (user_id, encode_interaction(skill_id, correct, num_skills))
        for user_id, skill_id, correct in data
    ]
    vector_names = feature_names(num_skills)

    print(f"Encoded {len(encoded_data)} interactions into {len(vector_names)}-dim vectors")
    print(f"Feature order: {vector_names}")
    print("\nFirst 5 rows:")
    for _user_id, vector in encoded_data[:5]:
        print(f"  user_id={_user_id}, vector={vector}")
    return (num_skills,)


@app.cell
def _():
    import torch

    from dkt_model import DKT, build_student_sequences, dkt_loss, train_dkt

    return DKT, build_student_sequences, dkt_loss, torch, train_dkt


@app.cell
def _(SKILLS, data, num_skills, train_dkt):
    model, results = train_dkt(data, num_skills)
    val_preds = results["val_preds"]
    val_skills = results["val_skills"]
    val_corrects = results["val_corrects"]

    mastery = val_preds.mean(dim=1)
    print("\nPer-skill mastery estimates (validation set mean):")
    for _skill_id, skill_name in enumerate(SKILLS):
        print(f"  {skill_name}: {mastery[:, _skill_id].mean().item():.1%}")

    print("\nSample predictions for first validation student:")
    student_preds = val_preds[0]
    student_skills = val_skills[0]
    student_corrects = val_corrects[0]
    for step in range(student_preds.size(0)):
        practiced_skill = student_skills[step].item()
        predicted = student_preds[step, practiced_skill].item()
        actual = int(student_corrects[step].item())
        print(
            f"  step {step + 1:2d}: {SKILLS[practiced_skill]:14s} "
            f"pred={predicted:.2f} actual={actual}"
        )
    return


if __name__ == "__main__":
    app.run()
