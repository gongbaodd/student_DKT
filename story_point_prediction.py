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
        component_ids: torch.Tensor
        points: torch.Tensor
        next_ticket: torch.Tensor
        target: torch.Tensor

    COMPONENTS = ["frontend", "backend", "infra"]
    MAX_POINTS = 13.0
    FIBONACCI_POINTS = (1.0, 2.0, 3.0, 5.0, 8.0, 13.0)

    # ticket 只有可观察特征 (component); 复杂度不是输入,
    # 它就是 story point 本身, 由模型的 beta 从历史估点数据中学出
    @dataclass(frozen=True)
    class Ticket:
        component: int

    TICKETS: dict[str, Ticket] = {
        "T1": Ticket(component=0),
        "T2": Ticket(component=0),
        "T3": Ticket(component=1),
        "T4": Ticket(component=1),
        "T5": Ticket(component=2),
        "T6": Ticket(component=0),
    }

    # 团队按时间排序的已完成 ticket 序列: (ticket_id, story point)
    team_seq = [("T1", 2), ("T2", 5), ("T3", 8), ("T4", 5), ("T5", 8)]

    return (
        COMPONENTS,
        FIBONACCI_POINTS,
        MAX_POINTS,
        TICKETS,
        Ticket,
        TrainingSample,
        math,
        nn,
        random,
        team_seq,
        torch,
    )


@app.cell
def _(MAX_POINTS, nn, torch):
    class DKT_IRT_StoryPoints(nn.Module):
        def __init__(
            self,
            num_components: int,
            num_tickets: int,
            embed_dim: int = 16,
            hidden_dim: int = 32,
        ) -> None:
            super().__init__()
            self.component_emb = nn.Embedding(num_components, embed_dim)
            self.lstm = nn.LSTM(embed_dim + 1, hidden_dim, batch_first=True)
            self.theta_layer = nn.Linear(hidden_dim, 1)  # theta: 团队对该类工作的熟悉度
            self.beta = nn.Embedding(num_tickets, 1)  # beta: ticket 内在复杂度 (学出)

        def forward(
            self,
            component_ids: torch.Tensor,
            points: torch.Tensor,
            next_ticket: torch.Tensor,
        ) -> torch.Tensor:
            emb = self.component_emb(component_ids)
            x = torch.cat([emb, points.unsqueeze(-1)], dim=-1)
            h, _ = self.lstm(x)
            theta = self.theta_layer(h[:, -1])
            beta = self.beta(next_ticket)
            # ticket 越复杂 (beta 高)、团队越不熟 (theta 低), 估点越大
            pred = MAX_POINTS * torch.sigmoid(beta - theta)
            return pred.squeeze(-1)

    return (DKT_IRT_StoryPoints,)


@app.cell
def _(FIBONACCI_POINTS, MAX_POINTS, Ticket, TrainingSample, torch):
    def ticket_index(ticket_ids: list[str]) -> dict[str, int]:
        return {ticket_id: index for index, ticket_id in enumerate(ticket_ids)}

    def snap_to_fibonacci(points: float) -> float:
        return min(FIBONACCI_POINTS, key=lambda fib: abs(fib - points))

    def build_training_samples(
        team_seq: list[tuple[str, float]],
        tickets: dict[str, Ticket],
        t_to_idx: dict[str, int],
    ) -> list[TrainingSample]:
        samples: list[TrainingSample] = []
        for target_pos in range(1, len(team_seq)):
            history = team_seq[:target_pos]
            next_tid, target_points = team_seq[target_pos]

            component_ids = torch.tensor(
                [tickets[tid].component for tid, _ in history],
                dtype=torch.long,
            )
            points = torch.tensor(
                [pts / MAX_POINTS for _, pts in history],
                dtype=torch.float32,
            )
            next_ticket = torch.tensor(t_to_idx[next_tid], dtype=torch.long)
            target = torch.tensor(target_points, dtype=torch.float32)
            samples.append(TrainingSample(component_ids, points, next_ticket, target))
        return samples

    def collate_samples(samples: list[TrainingSample]) -> tuple[torch.Tensor, ...]:
        max_len = max(sample.component_ids.size(0) for sample in samples)
        batch_size = len(samples)

        component_ids = torch.zeros(batch_size, max_len, dtype=torch.long)
        points = torch.zeros(batch_size, max_len, dtype=torch.float32)
        next_ticket = torch.stack([sample.next_ticket for sample in samples])
        targets = torch.stack([sample.target for sample in samples])

        for row, sample in enumerate(samples):
            seq_len = sample.component_ids.size(0)
            component_ids[row, :seq_len] = sample.component_ids
            points[row, :seq_len] = sample.points

        return component_ids, points, next_ticket, targets

    def train_model(
        model,
        samples: list[TrainingSample],
        criterion,
        optimizer,
        epochs: int = 100,
    ) -> list[float]:
        losses: list[float] = []
        for epoch in range(1, epochs + 1):
            component_ids, points, next_ticket, targets = collate_samples(samples)
            pred = model(component_ids, points, next_ticket)
            loss = criterion(pred, targets)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            losses.append(loss.item())

            if epoch == 1 or epoch % 50 == 0 or epoch == epochs:
                print(f"Epoch {epoch:3d}: train_mse={loss.item():.4f}")

        return losses

    def predict_story_points(
        model,
        team_seq: list[tuple[str, float]],
        next_ticket_id: str,
        tickets: dict[str, Ticket],
        t_to_idx: dict[str, int],
    ) -> float:
        model.eval()
        with torch.no_grad():
            component_ids = torch.tensor(
                [[tickets[tid].component for tid, _ in team_seq]],
                dtype=torch.long,
            )
            points = torch.tensor(
                [[pts / MAX_POINTS for _, pts in team_seq]],
                dtype=torch.float32,
            )
            next_ticket = torch.tensor([t_to_idx[next_ticket_id]], dtype=torch.long)
            return model(component_ids, points, next_ticket).item()

    return (
        build_training_samples,
        collate_samples,
        predict_story_points,
        snap_to_fibonacci,
        ticket_index,
        train_model,
    )


@app.cell
def _(COMPONENTS, TICKETS, team_seq, ticket_index):
    t_to_idx = ticket_index(list(TICKETS))

    print("DKT + IRT: suggest story points for the next ticket (Fibonacci 1-13)")
    print("\nTicket backlog:")
    for ticket_id, ticket in TICKETS.items():
        print(f"  {ticket_id}: component={COMPONENTS[ticket.component]}")

    print("\nTeam estimation history:")
    for ticket_id, pts in team_seq:
        component_name = COMPONENTS[TICKETS[ticket_id].component]
        print(f"  {ticket_id} ({component_name}): {pts} points")
    return (t_to_idx,)


@app.cell
def _(
    COMPONENTS,
    DKT_IRT_StoryPoints,
    TICKETS,
    build_training_samples,
    nn,
    predict_story_points,
    snap_to_fibonacci,
    t_to_idx,
    team_seq,
    torch,
    train_model,
):
    samples = build_training_samples(team_seq, TICKETS, t_to_idx)

    print("Training windows (history -> next ticket points):")
    for sample in samples:
        history_len = sample.component_ids.size(0)
        target = sample.target.item()
        _next_t = list(TICKETS)[sample.next_ticket.item()]
        print(f"  history_len={history_len} -> predict {_next_t} (target={target})")

    torch.manual_seed(42)
    model = DKT_IRT_StoryPoints(len(COMPONENTS), len(TICKETS))

    _criterion = nn.MSELoss()
    _optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    losses = train_model(model, samples, _criterion, _optimizer, epochs=200)

    pred_t5 = predict_story_points(model, team_seq[:4], "T5", TICKETS, t_to_idx)
    pred_t6 = predict_story_points(model, team_seq, "T6", TICKETS, t_to_idx)

    print(f"\nFinal train MSE: {losses[-1]:.4f}")
    print(
        f"Suggest T5 (history T1-T4): {pred_t5:.2f}"
        f" -> {snap_to_fibonacci(pred_t5):.0f} points (actual=8)"
    )
    print(
        f"Suggest T6 (full history):  {pred_t6:.2f}"
        f" -> {snap_to_fibonacci(pred_t6):.0f} points"
    )

    with torch.no_grad():
        _component_ids = torch.tensor(
            [[TICKETS[t].component for t, _ in team_seq]],
            dtype=torch.long,
        )
        _points = torch.tensor(
            [[p / 13.0 for _, p in team_seq]],
            dtype=torch.float32,
        ).unsqueeze(-1)
        x = torch.cat([model.component_emb(_component_ids), _points], dim=-1)
        h, _ = model.lstm(x)
        theta = model.theta_layer(h[:, -1]).item()
        beta_t6 = model.beta.weight[t_to_idx["T6"]].item()

    irt_check = 13 * torch.sigmoid(torch.tensor(beta_t6 - theta)).item()
    print(f"\nEstimated theta={theta:.2f}, beta(T6)={beta_t6:.2f}")
    print(f"IRT check: 13*sigmoid(beta-theta) = {irt_check:.2f}")

    print("\nLearned ticket complexity (beta, higher = more points):")
    with torch.no_grad():
        for _tid in TICKETS:
            print(f"  {_tid}: beta={model.beta.weight[t_to_idx[_tid]].item():+.2f}")
    return


@app.cell
def _(MAX_POINTS, Ticket, math, random, snap_to_fibonacci):
    def _sigmoid(x: float) -> float:
        if x >= 0:
            return 1 / (1 + math.exp(-x))
        z = math.exp(x)
        return z / (1 + z)

    # 合成数据的隐藏真值: ticket 的真实复杂度。
    # 模型看不到它, 只能从各团队的估点序列把 beta 学出来
    LATENT_COMPLEXITY = {
        "T1": -1.0,
        "T2": 0.5,
        "T3": 1.0,
        "T4": 0.0,
        "T5": 0.8,
        "T6": 0.2,
    }

    def generate_synthetic_team(
        team_id: int,
        tickets: dict[str, Ticket],
        ticket_ids: list[str],
        rng: random.Random,
        seq_len: int = 12,
        learning_gain: float = 0.05,
        points_noise: float = 0.6,
    ) -> tuple[int, list[tuple[str, float]]]:
        # 每个团队对每个 component 有随机初始熟悉度
        num_components = max(t.component for t in tickets.values()) + 1
        theta = {c: rng.uniform(-0.5, 1.5) for c in range(num_components)}
        rows: list[tuple[str, float]] = []

        for _ in range(seq_len):
            ticket_id = rng.choice(ticket_ids)
            component = tickets[ticket_id].component
            beta = LATENT_COMPLEXITY[ticket_id]
            raw = MAX_POINTS * _sigmoid(beta - theta[component])
            noisy = max(1.0, min(MAX_POINTS, raw + rng.gauss(0.0, points_noise)))
            rows.append((ticket_id, snap_to_fibonacci(noisy)))

            # 做完一张票, 团队对该 component 更熟悉, 之后同类票估得更低
            theta[component] += learning_gain

        return team_id, rows

    def build_synthetic_dataset(
        tickets: dict[str, Ticket],
        num_teams: int,
        seed: int = 42,
    ) -> dict[int, list[tuple[str, float]]]:
        rng = random.Random(seed)
        ticket_ids = list(tickets)
        by_team: dict[int, list[tuple[str, float]]] = {}
        for team_id in range(num_teams):
            tid, seq = generate_synthetic_team(team_id, tickets, ticket_ids, rng)
            by_team[tid] = seq
        return by_team

    return LATENT_COMPLEXITY, build_synthetic_dataset


@app.cell
def _(
    COMPONENTS,
    DKT_IRT_StoryPoints,
    LATENT_COMPLEXITY,
    MAX_POINTS,
    TICKETS,
    TrainingSample,
    build_synthetic_dataset,
    build_training_samples,
    collate_samples,
    nn,
    predict_story_points,
    snap_to_fibonacci,
    t_to_idx,
    torch,
    train_model,
):
    num_teams = 80
    dataset = build_synthetic_dataset(TICKETS, num_teams)

    all_samples: list[TrainingSample] = []
    for team_seq_synth in dataset.values():
        all_samples.extend(build_training_samples(team_seq_synth, TICKETS, t_to_idx))

    perm = torch.randperm(len(all_samples))
    val_size = max(1, len(all_samples) // 5)
    val_idx = perm[:val_size]
    train_idx = perm[val_size:]
    train_samples = [all_samples[i] for i in train_idx]
    val_samples = [all_samples[i] for i in val_idx]

    torch.manual_seed(42)
    synth_model = DKT_IRT_StoryPoints(len(COMPONENTS), len(TICKETS))

    _criterion = nn.MSELoss()
    _optimizer = torch.optim.Adam(synth_model.parameters(), lr=1e-3)
    print(f"\nSynthetic dataset: {num_teams} teams, {len(all_samples)} windows")
    train_model(synth_model, train_samples, _criterion, _optimizer, epochs=60)

    synth_model.eval()
    with torch.no_grad():
        _component_ids, _points, _next_ticket, _targets = collate_samples(val_samples)
        val_pred = synth_model(_component_ids, _points, _next_ticket)
        val_mse = _criterion(val_pred, _targets).item()
        val_mae = (val_pred - _targets).abs().mean().item()
        snapped = torch.tensor([snap_to_fibonacci(p.item()) for p in val_pred])
        fib_acc = (snapped == _targets).float().mean().item()

    print(
        f"Validation MSE: {val_mse:.4f}, MAE: {val_mae:.2f}"
        f" (scale 1-{MAX_POINTS:.0f})"
    )
    print(f"Fibonacci accuracy (snap to nearest): {fib_acc:.1%}")

    print("\nLearned beta vs latent ground truth:")
    with torch.no_grad():
        for _tid in TICKETS:
            learned = synth_model.beta.weight[t_to_idx[_tid]].item()
            truth = LATENT_COMPLEXITY[_tid]
            print(f"  {_tid}: learned={learned:+.2f}, latent={truth:+.2f}")

    example_team = dataset[0]
    _next_t = example_team[-1][0]
    _history = example_team[:-1]
    _actual = example_team[-1][1]
    _predicted = predict_story_points(synth_model, _history, _next_t, TICKETS, t_to_idx)
    print(
        f"\nExample team 0: suggest {_next_t} = {_predicted:.2f}"
        f" -> {snap_to_fibonacci(_predicted):.0f} points (actual={_actual:.0f})"
    )
    return


if __name__ == "__main__":
    app.run()
