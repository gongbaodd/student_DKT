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
    import torch.nn as nn
    import torch.nn.functional as F
    # 3 skills, 6 length vectors
    class DKT(nn.Module):
        def __init__(self, num_skills: int, hidden_dim: int = 50):
            super().__init__()
            input_dim = 2 * num_skills
            self.lstm = nn.LSTM(input_dim, hidden_dim, batch_first=True)
            self.out = nn.Linear(hidden_dim, num_skills) 

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            h, _ = self.lstm(x) # input [h1, h2, h3, h4]
            zeros = torch.zeros(x.size(0), 1, h.size(-1), device=x.device, dtype=h.dtype)  
            h_prev = torch.cat([zeros, h[:, :-1]], dim=1) # out [0, h1, h2, h3]
            return torch.sigmoid(self.out(h_prev)) # -> [p1. p2, p3] on h4

    def build_student_sequences(
        data: list[tuple[int, int, int]],
        num_skills: int,
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        from collections import defaultdict

        from dkt_encoder import encode_interaction

        by_student: dict[int, list[tuple[int, int]]] = defaultdict(list)
        for user_id, skill_id, correct in data:
            by_student[user_id].append((skill_id, correct))

        inputs, skills, corrects = [], [], []
        for user_id in sorted(by_student):
            seq = by_student[user_id]
            skills_t = [skill_id for skill_id, _ in seq]
            corrects_t = [correct for _, correct in seq]
            inputs_t = [
                encode_interaction(skill_id, correct, num_skills)
                for skill_id, correct in seq
            ]
            inputs.append(torch.tensor(inputs_t, dtype=torch.float32))
            skills.append(torch.tensor(skills_t, dtype=torch.long))
            corrects.append(torch.tensor(corrects_t, dtype=torch.float32))

        return torch.stack(inputs), torch.stack(skills), torch.stack(corrects)

    def dkt_loss(
        preds: torch.Tensor,
        skills: torch.Tensor,
        corrects: torch.Tensor,
    ) -> torch.Tensor:
        selected = preds.gather(2, skills.unsqueeze(-1)).squeeze(-1)
        return F.binary_cross_entropy(selected, corrects)

    return DKT, build_student_sequences, dkt_loss, torch


@app.cell
def _(DKT, SKILLS, build_student_sequences, data, dkt_loss, num_skills, torch):
    torch.manual_seed(42)
    hidden_dim = 50
    epochs = 30
    lr = 0.01
    val_fraction = 0.2

    inputs, skills, corrects = build_student_sequences(data, num_skills)
    num_students = inputs.size(0)

    perm = torch.randperm(num_students)
    val_size = max(1, int(num_students * val_fraction))
    val_idx, train_idx = perm[:val_size], perm[val_size:]

    train_inputs, train_skills, train_corrects = (
        inputs[train_idx],
        skills[train_idx],
        corrects[train_idx],
    )
    val_inputs, val_skills, val_corrects = (
        inputs[val_idx],
        skills[val_idx],
        corrects[val_idx],
    )

    model = DKT(num_skills, hidden_dim)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    print(
        f"DKT: {num_skills} skills, input_dim={2 * num_skills}, "
        f"hidden_dim={hidden_dim}"
    )
    print(f"Sequences: {num_students} students x {inputs.size(1)} steps")
    print(f"Train: {train_idx.numel()} students, Val: {val_idx.numel()} students")

    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad()
        train_preds = model(train_inputs)
        loss = dkt_loss(train_preds, train_skills, train_corrects)
        loss.backward()
        optimizer.step()

        model.eval()
        with torch.no_grad():
            val_preds = model(val_inputs)
            val_loss = dkt_loss(val_preds, val_skills, val_corrects)
            val_selected = val_preds.gather(2, val_skills.unsqueeze(-1)).squeeze(-1)
            val_acc = (
                (val_selected.round() == val_corrects).float().mean().item()
            )

        if epoch == 1 or epoch % 5 == 0 or epoch == epochs:
            print(
                f"Epoch {epoch:2d}: train_loss={loss.item():.4f}, "
                f"val_loss={val_loss.item():.4f}, val_acc={val_acc:.1%}"
            )

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
