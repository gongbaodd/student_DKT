import marimo

__generated_with = "0.23.9"
app = marimo.App(width="full")


@app.cell
def _():
    import os
    import sys
    from pathlib import Path

    repo_root = Path(__file__).resolve().parent.parent
    os.chdir(repo_root)
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))

    from museum_dkt_generator import (
        INTERACTIONS_PER_STUDENT,
        NUM_STUDENTS,
        SKILLS,
        generate_student_sequence,
        populate_data,
    )

    return (
        INTERACTIONS_PER_STUDENT,
        NUM_STUDENTS,
        SKILLS,
        generate_student_sequence,
        populate_data,
    )


@app.cell
def _(INTERACTIONS_PER_STUDENT, NUM_STUDENTS, SKILLS, populate_data):
    import marimo as mo

    seed_input = mo.ui.number(value=42, start=0, stop=10_000, label="Seed")
    student_input = mo.ui.slider(
        start=0,
        stop=NUM_STUDENTS - 1,
        value=0,
        label="Student",
        show_value=True,
    )
    mo.vstack([seed_input, student_input])
    return mo, seed_input, student_input


@app.cell
def _(INTERACTIONS_PER_STUDENT, NUM_STUDENTS, SKILLS, populate_data, seed_input):
    data = populate_data(int(seed_input.value))

    student_counts: dict[int, int] = {}
    skill_counts: dict[int, int] = {skill_id: 0 for skill_id in range(len(SKILLS))}
    correct_count = 0

    for user_id, skill_id, correct in data:
        student_counts[user_id] = student_counts.get(user_id, 0) + 1
        skill_counts[skill_id] += 1
        correct_count += correct

    accuracy = correct_count / len(data)

    print(f"Skills: {len(SKILLS)}")
    print(f"Students: {len(student_counts)}")
    print(f"Total interactions: {len(data)}")
    print(f"Interactions per student: {INTERACTIONS_PER_STUDENT}")
    print("Per-skill attempts:")
    for skill_id, count in skill_counts.items():
        print(f"  {skill_id} ({SKILLS[skill_id]}): {count}")
    print(f"Overall accuracy: {accuracy:.1%}")

    assert len(data) == NUM_STUDENTS * INTERACTIONS_PER_STUDENT
    assert len(student_counts) == NUM_STUDENTS
    assert all(count == INTERACTIONS_PER_STUDENT for count in student_counts.values())
    return accuracy, correct_count, data, skill_counts


@app.cell
def _(
    INTERACTIONS_PER_STUDENT,
    SKILLS,
    data,
    mo,
    seed_input,
    student_input,
):
    student_id = int(student_input.value)
    start = student_id * INTERACTIONS_PER_STUDENT
    sequence = data[start : start + INTERACTIONS_PER_STUDENT]
    correct_in_sequence = sum(correct for _, _, correct in sequence)

    rows = [
        {
            "step": step + 1,
            "skill_id": skill_id,
            "skill": SKILLS[skill_id],
            "correct": "yes" if correct else "no",
        }
        for step, (_, skill_id, correct) in enumerate(sequence)
    ]

    mo.vstack(
        [
            mo.md(f"""
    ## Student {student_id} sequence (seed {int(seed_input.value)})

    **{correct_in_sequence}/{INTERACTIONS_PER_STUDENT}** correct on this student's path.
    """),
            mo.ui.table(rows),
        ]
    )
    return rows, sequence, student_id


@app.cell
def _(INTERACTIONS_PER_STUDENT, NUM_STUDENTS, accuracy, correct_count, mo):
    mo.md(f"""
    ## Interaction outcome heatmaps (by skill)

    One chart per museum cluster. **White** = another skill at that step;
    **green** = correct; **grey** = incorrect.

    **{correct_count:,}** correct / **{NUM_STUDENTS * INTERACTIONS_PER_STUDENT - correct_count:,}** incorrect
    ({accuracy:.1%} accuracy across {NUM_STUDENTS:,} students).
    """)
    return


@app.cell
def _(
    INTERACTIONS_PER_STUDENT,
    NUM_STUDENTS,
    SKILLS,
    data,
):
    import matplotlib.pyplot as plt
    import numpy as np
    from matplotlib.colors import ListedColormap
    from matplotlib.patches import Patch

    skills = np.zeros((NUM_STUDENTS, INTERACTIONS_PER_STUDENT), dtype=int)
    outcome = np.zeros((NUM_STUDENTS, INTERACTIONS_PER_STUDENT), dtype=int)
    step_by_student = np.zeros(NUM_STUDENTS, dtype=int)
    for _user_id, _skill_id, _correct in data:
        _step = step_by_student[_user_id]
        skills[_user_id, _step] = _skill_id
        outcome[_user_id, _step] = _correct
        step_by_student[_user_id] += 1

    panel_cmap = ListedColormap(["#ffffff", "#8b949e", "#39d353"])

    _fig, _axes = plt.subplots(len(SKILLS), 1, figsize=(12, 2.2 * len(SKILLS)), sharex=True)
    if len(SKILLS) == 1:
        _axes = [_axes]

    for _skill_id, (_ax, _skill_name) in enumerate(zip(_axes, SKILLS, strict=True)):
        _panel = np.zeros((NUM_STUDENTS, INTERACTIONS_PER_STUDENT), dtype=int)
        _is_skill = skills == _skill_id
        _panel[_is_skill & (outcome == 0)] = 1
        _panel[_is_skill & (outcome == 1)] = 2

        _ax.imshow(
            _panel,
            aspect="auto",
            interpolation="nearest",
            cmap=panel_cmap,
            vmin=0,
            vmax=2,
        )
        _ax.set_ylabel("Student")
        _ax.set_title(_skill_name)
        _ax.set_yticks(range(0, NUM_STUDENTS, 20))
        _ax.set_yticklabels(range(0, NUM_STUDENTS, 20))

    _axes[-1].set_xlabel("Interaction step")
    _axes[-1].set_xticks(range(INTERACTIONS_PER_STUDENT))
    _axes[-1].set_xticklabels(range(1, INTERACTIONS_PER_STUDENT + 1))

    _fig.legend(
        handles=[
            Patch(facecolor="#ffffff", edgecolor="#d0d7de", label="Other skill"),
            Patch(facecolor="#39d353", edgecolor="#30363d", label="Correct"),
            Patch(facecolor="#8b949e", edgecolor="#30363d", label="Incorrect"),
        ],
        loc="upper right",
        bbox_to_anchor=(0.99, 1.02),
        ncol=3,
        framealpha=0.9,
        fontsize=8,
    )
    _fig.suptitle(
        f"Museum cluster interactions ({NUM_STUDENTS} × {INTERACTIONS_PER_STUDENT})",
        y=1.01,
    )
    _fig.tight_layout()
    _fig
    return


if __name__ == "__main__":
    app.run()
