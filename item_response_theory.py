import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium")


@app.cell
def _():
    import math
    import random
    from dataclasses import dataclass
    from typing import NamedTuple

    import torch
    import torch.nn as nn

    class TrainingSample(NamedTuple):
        skill_ids: torch.Tensor
        scores: torch.Tensor
        next_question: torch.Tensor
        target: torch.Tensor

    SKILLS = ["addition", "multiplication"]
    MAX_SCORE = 10.0

    @dataclass(frozen=True)
    class Question:
        skill: int
        difficulty: float

    QUESTIONS: dict[str, Question] = {
        "q1": Question(skill=0, difficulty=-1.0),
        "q2": Question(skill=0, difficulty=0.5),
        "q3": Question(skill=1, difficulty=1.0),
        "q4": Question(skill=1, difficulty=0.0),
        "q5": Question(skill=0, difficulty=0.2),
    }

    student_seq = [("q1", 8), ("q2", 10), ("q3", 4), ("q4", 6)]

    return (
        MAX_SCORE,
        QUESTIONS,
        Question,
        SKILLS,
        TrainingSample,
        math,
        nn,
        random,
        student_seq,
        torch,
    )


@app.cell
def _(MAX_SCORE, Question, nn, torch):
    class DKT_IRT(nn.Module):
        def __init__(
            self,
            num_skills: int,
            num_questions: int,
            embed_dim: int = 16,
            hidden_dim: int = 32,
        ) -> None:
            super().__init__()
            self.skill_emb = nn.Embedding(num_skills, embed_dim)
            self.lstm = nn.LSTM(embed_dim + 1, hidden_dim, batch_first=True)
            self.theta_layer = nn.Linear(hidden_dim, 1)
            self.beta = nn.Embedding(num_questions, 1)

        def forward(
            self,
            skill_ids: torch.Tensor,
            scores: torch.Tensor,
            next_question: torch.Tensor,
        ) -> torch.Tensor:
            emb = self.skill_emb(skill_ids)
            x = torch.cat([emb, scores.unsqueeze(-1)], dim=-1)
            h, _ = self.lstm(x)
            theta = self.theta_layer(h[:, -1])
            beta = self.beta(next_question)
            pred = MAX_SCORE * torch.sigmoid(theta - beta)
            return pred.squeeze(-1)

    return (DKT_IRT,)


@app.cell
def _(MAX_SCORE, Question, TrainingSample, torch):
    def question_index(question_ids: list[str]) -> dict[str, int]:
        return {question_id: index for index, question_id in enumerate(question_ids)}

    def build_training_samples(
        student_seq: list[tuple[str, float]],
        questions: dict[str, Question],
        q_to_idx: dict[str, int],
    ) -> list[TrainingSample]:
        samples: list[TrainingSample] = []
        for target_pos in range(1, len(student_seq)):
            history = student_seq[:target_pos]
            next_qid, target_score = student_seq[target_pos]

            skill_ids = torch.tensor(
                [questions[qid].skill for qid, _ in history],
                dtype=torch.long,
            )
            scores = torch.tensor(
                [score / MAX_SCORE for _, score in history],
                dtype=torch.float32,
            )
            next_question = torch.tensor(q_to_idx[next_qid], dtype=torch.long)
            target = torch.tensor(target_score, dtype=torch.float32)
            samples.append(TrainingSample(skill_ids, scores, next_question, target))
        return samples

    def collate_samples(samples: list[TrainingSample]) -> tuple[torch.Tensor, ...]:
        max_len = max(sample.skill_ids.size(0) for sample in samples)
        batch_size = len(samples)

        skill_ids = torch.zeros(batch_size, max_len, dtype=torch.long)
        scores = torch.zeros(batch_size, max_len, dtype=torch.float32)
        next_question = torch.stack([sample.next_question for sample in samples])
        targets = torch.stack([sample.target for sample in samples])

        for row, sample in enumerate(samples):
            seq_len = sample.skill_ids.size(0)
            skill_ids[row, :seq_len] = sample.skill_ids
            scores[row, :seq_len] = sample.scores

        return skill_ids, scores, next_question, targets

    def init_beta_from_questions(
        model,
        questions: dict[str, Question],
        q_to_idx: dict[str, int],
    ) -> None:
        with torch.no_grad():
            for question_id, question in questions.items():
                model.beta.weight[q_to_idx[question_id]] = question.difficulty

    def train_model(
        model,
        samples: list[TrainingSample],
        criterion,
        optimizer,
        epochs: int = 100,
    ) -> list[float]:
        losses: list[float] = []
        for epoch in range(1, epochs + 1):
            skill_ids, scores, next_question, targets = collate_samples(samples)
            pred = model(skill_ids, scores, next_question)
            loss = criterion(pred, targets)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            losses.append(loss.item())

            if epoch == 1 or epoch % 50 == 0 or epoch == epochs:
                print(f"Epoch {epoch:3d}: train_mse={loss.item():.4f}")

        return losses

    def predict_next_score(
        model,
        student_seq: list[tuple[str, float]],
        next_question_id: str,
        questions: dict[str, Question],
        q_to_idx: dict[str, int],
    ) -> float:
        model.eval()
        with torch.no_grad():
            skill_ids = torch.tensor(
                [[questions[qid].skill for qid, _ in student_seq]],
                dtype=torch.long,
            )
            scores = torch.tensor(
                [[score / MAX_SCORE for _, score in student_seq]],
                dtype=torch.float32,
            )
            next_question = torch.tensor([q_to_idx[next_question_id]], dtype=torch.long)
            return model(skill_ids, scores, next_question).item()

    return (
        build_training_samples,
        collate_samples,
        init_beta_from_questions,
        predict_next_score,
        question_index,
        train_model,
    )


@app.cell
def _(QUESTIONS, SKILLS, question_index, student_seq):
    q_to_idx = question_index(list(QUESTIONS))

    print("DKT + IRT: predict next question score (0-10)")
    print("\nQuestion bank:")
    for question_id, question in QUESTIONS.items():
        print(
            f"  {question_id}: skill={SKILLS[question.skill]}, "
            f"difficulty={question.difficulty}"
        )

    print("\nStudent history:")
    for question_id, score in student_seq:
        skill_name = SKILLS[QUESTIONS[question_id].skill]
        print(f"  {question_id} ({skill_name}): {score}")
    return (q_to_idx,)


@app.cell
def _(
    DKT_IRT,
    QUESTIONS,
    SKILLS,
    build_training_samples,
    init_beta_from_questions,
    nn,
    predict_next_score,
    q_to_idx,
    student_seq,
    torch,
    train_model,
):
    samples = build_training_samples(student_seq, QUESTIONS, q_to_idx)

    print("Training windows (history -> next score):")
    for sample in samples:
        history_len = sample.skill_ids.size(0)
        target = sample.target.item()
        _next_q = list(QUESTIONS)[sample.next_question.item()]
        print(f"  history_len={history_len} -> predict {_next_q} (target={target})")

    torch.manual_seed(42)
    model = DKT_IRT(len(SKILLS), len(QUESTIONS))
    init_beta_from_questions(model, QUESTIONS, q_to_idx)

    _criterion = nn.MSELoss()
    _optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    losses = train_model(model, samples, _criterion, _optimizer, epochs=200)

    pred_q4 = predict_next_score(model, student_seq[:3], "q4", QUESTIONS, q_to_idx)
    pred_q5 = predict_next_score(model, student_seq, "q5", QUESTIONS, q_to_idx)

    print(f"\nFinal train MSE: {losses[-1]:.4f}")
    print(f"Predict q4 (history q1-q3): {pred_q4:.2f} (actual=6)")
    print(f"Predict q5 (full history):  {pred_q5:.2f}")

    with torch.no_grad():
        _skill_ids = torch.tensor(
            [[QUESTIONS[q].skill for q, _ in student_seq]],
            dtype=torch.long,
        )
        _scores = torch.tensor(
            [[s / 10.0 for _, s in student_seq]],
            dtype=torch.float32,
        ).unsqueeze(-1)
        x = torch.cat([model.skill_emb(_skill_ids), _scores], dim=-1)
        h, _ = model.lstm(x)
        theta = model.theta_layer(h[:, -1]).item()
        beta_q5 = model.beta.weight[q_to_idx["q5"]].item()

    irt_check = 10 * torch.sigmoid(torch.tensor(theta - beta_q5)).item()
    print(f"\nEstimated theta={theta:.2f}, beta(q5)={beta_q5:.2f}")
    print(f"IRT check: 10*sigmoid(theta-beta) = {irt_check:.2f}")
    return


@app.cell
def _(MAX_SCORE, Question, TrainingSample, math, random):
    def _sigmoid(x: float) -> float:
        if x >= 0:
            return 1 / (1 + math.exp(-x))
        z = math.exp(x)
        return z / (1 + z)

    def generate_synthetic_student(
        student_id: int,
        questions: dict[str, Question],
        question_ids: list[str],
        rng: random.Random,
        seq_len: int = 12,
        theta_noise: float = 0.15,
        score_noise: float = 0.4,
    ) -> tuple[int, list[tuple[str, float]]]:
        theta = {0: rng.uniform(-0.5, 1.5), 1: rng.uniform(-0.5, 1.5)}
        rows: list[tuple[str, float]] = []

        for _ in range(seq_len):
            question_id = rng.choice(question_ids)
            skill = questions[question_id].skill
            beta = questions[question_id].difficulty
            raw = MAX_SCORE * _sigmoid(theta[skill] - beta)
            score = max(0.0, min(MAX_SCORE, raw + rng.gauss(0.0, score_noise)))
            rows.append((question_id, score))
            observed = score / MAX_SCORE
            theta[skill] += theta_noise * (observed - _sigmoid(theta[skill] - beta))

        return student_id, rows

    def build_synthetic_dataset(
        questions: dict[str, Question],
        num_students: int,
        seed: int = 42,
    ) -> dict[int, list[tuple[str, float]]]:
        rng = random.Random(seed)
        question_ids = list(questions)
        by_student: dict[int, list[tuple[str, float]]] = {}
        for student_id in range(num_students):
            sid, seq = generate_synthetic_student(
                student_id, questions, question_ids, rng
            )
            by_student[sid] = seq
        return by_student

    return build_synthetic_dataset,


@app.cell
def _(
    DKT_IRT,
    MAX_SCORE,
    QUESTIONS,
    SKILLS,
    TrainingSample,
    build_synthetic_dataset,
    build_training_samples,
    collate_samples,
    init_beta_from_questions,
    nn,
    predict_next_score,
    q_to_idx,
    torch,
    train_model,
):
    num_students = 80
    dataset = build_synthetic_dataset(QUESTIONS, num_students)

    all_samples: list[TrainingSample] = []
    for student_seq_synth in dataset.values():
        all_samples.extend(build_training_samples(student_seq_synth, QUESTIONS, q_to_idx))

    perm = torch.randperm(len(all_samples))
    val_size = max(1, len(all_samples) // 5)
    val_idx = perm[:val_size]
    train_idx = perm[val_size:]
    train_samples = [all_samples[i] for i in train_idx]
    val_samples = [all_samples[i] for i in val_idx]

    torch.manual_seed(42)
    synth_model = DKT_IRT(len(SKILLS), len(QUESTIONS))
    init_beta_from_questions(synth_model, QUESTIONS, q_to_idx)

    _criterion = nn.MSELoss()
    _optimizer = torch.optim.Adam(synth_model.parameters(), lr=1e-3)
    print(f"\nSynthetic dataset: {num_students} students, {len(all_samples)} windows")
    train_model(synth_model, train_samples, _criterion, _optimizer, epochs=60)

    synth_model.eval()
    with torch.no_grad():
        _skill_ids, _scores, _next_question, _targets = collate_samples(val_samples)
        val_pred = synth_model(_skill_ids, _scores, _next_question)
        val_mse = _criterion(val_pred, _targets).item()
        val_mae = (val_pred - _targets).abs().mean().item()

    print(f"Validation MSE: {val_mse:.4f}, MAE: {val_mae:.2f} (scale 0-{MAX_SCORE:.0f})")

    example_student = dataset[0]
    _next_q = example_student[-1][0]
    _history = example_student[:-1]
    _actual = example_student[-1][1]
    _predicted = predict_next_score(synth_model, _history, _next_q, QUESTIONS, q_to_idx)
    print(f"Example student 0: predict {_next_q} = {_predicted:.2f} (actual={_actual:.1f})")
    return


if __name__ == "__main__":
    app.run()
