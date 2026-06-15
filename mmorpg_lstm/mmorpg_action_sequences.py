import marimo

__generated_with = "0.23.9"
app = marimo.App(width="full")


@app.cell
def _():
    import os
    import sys
    from pathlib import Path

    mmorpg_root = Path(__file__).resolve().parent
    repo_root = mmorpg_root.parent
    os.chdir(repo_root)
    if str(mmorpg_root) not in sys.path:
        sys.path.insert(0, str(mmorpg_root))

    from mmorpg_action_generator import (
        ACTIONS,
        INTERACTIONS_PER_PLAYER,
        NUM_PLAYERS,
        TRANSITION_BOOSTS,
        populate_data,
    )

    return (
        ACTIONS,
        INTERACTIONS_PER_PLAYER,
        NUM_PLAYERS,
        TRANSITION_BOOSTS,
        populate_data,
    )


@app.cell
def _(NUM_PLAYERS):
    import marimo as mo

    seed_input = mo.ui.number(value=42, start=0, stop=10_000, label="Seed")
    player_input = mo.ui.slider(
        start=0,
        stop=NUM_PLAYERS - 1,
        value=0,
        label="Player",
        show_value=True,
    )
    mo.vstack([seed_input, player_input])
    return mo, player_input, seed_input


@app.cell
def _(
    ACTIONS,
    INTERACTIONS_PER_PLAYER,
    NUM_PLAYERS,
    populate_data,
    seed_input,
):
    data = populate_data(int(seed_input.value))

    player_counts: dict[int, int] = {}
    action_counts: dict[int, int] = {action_id: 0 for action_id in range(len(ACTIONS))}

    for user_id, action_id in data:
        player_counts[user_id] = player_counts.get(user_id, 0) + 1
        action_counts[action_id] += 1

    print(f"Actions: {len(ACTIONS)}")
    print(f"Players: {len(player_counts)}")
    print(f"Total interactions: {len(data)}")
    print(f"Interactions per player: {INTERACTIONS_PER_PLAYER}")
    print("Per-action counts:")
    for action_id, count in action_counts.items():
        print(f"  {action_id} ({ACTIONS[action_id]}): {count}")

    assert len(data) == NUM_PLAYERS * INTERACTIONS_PER_PLAYER
    assert len(player_counts) == NUM_PLAYERS
    assert all(count == INTERACTIONS_PER_PLAYER for count in player_counts.values())
    return (data,)


@app.cell
def _(ACTIONS, INTERACTIONS_PER_PLAYER, data, mo, player_input, seed_input):
    player_id = int(player_input.value)
    start = player_id * INTERACTIONS_PER_PLAYER
    sequence = data[start : start + INTERACTIONS_PER_PLAYER]

    rows = [
        {
            "step": step + 1,
            "action_id": aid,
            "action": ACTIONS[aid],
        }
        for step, (_, aid) in enumerate(sequence)
    ]

    mo.vstack(
        [
            mo.md(f"""
    ## Player {player_id} sequence (seed {int(seed_input.value)})

    **{INTERACTIONS_PER_PLAYER}** menu choices on this player's path.
    """),
            mo.ui.table(rows),
        ]
    )
    return


@app.cell
def _(ACTIONS, INTERACTIONS_PER_PLAYER, NUM_PLAYERS, TRANSITION_BOOSTS, mo):
    boost_lines = []
    for source_id, targets in sorted(TRANSITION_BOOSTS.items()):
        for target_id, boost in sorted(targets.items()):
            boost_lines.append(
                f"- **{ACTIONS[source_id]}** → **{ACTIONS[target_id]}**: +{boost:.0%} weight"
            )

    mo.md(f"""
    ## Action heatmaps

    One chart per NPC menu action. **White** = another action at that step;
    **blue** = this action was chosen.

    **{NUM_PLAYERS:,}** players × **{INTERACTIONS_PER_PLAYER}** interactions each.

    ### Markov transition boosts
    {chr(10).join(boost_lines)}
    """)
    return


@app.cell
def _(ACTIONS, INTERACTIONS_PER_PLAYER, NUM_PLAYERS, data):
    import matplotlib.pyplot as plt
    import numpy as np
    from matplotlib.colors import ListedColormap
    from matplotlib.patches import Patch

    actions = np.zeros((NUM_PLAYERS, INTERACTIONS_PER_PLAYER), dtype=int)
    step_by_player = np.zeros(NUM_PLAYERS, dtype=int)
    for _user_id, _action_id in data:
        _step = step_by_player[_user_id]
        actions[_user_id, _step] = _action_id
        step_by_player[_user_id] += 1

    panel_cmap = ListedColormap(["#ffffff", "#58a6ff"])

    _fig, _axes = plt.subplots(len(ACTIONS), 1, figsize=(12, 2.2 * len(ACTIONS)), sharex=True)
    if len(ACTIONS) == 1:
        _axes = [_axes]

    for _action_id, (_ax, _action_name) in enumerate(zip(_axes, ACTIONS, strict=True)):
        _panel = np.zeros((NUM_PLAYERS, INTERACTIONS_PER_PLAYER), dtype=int)
        _panel[actions == _action_id] = 1

        _ax.imshow(
            _panel,
            aspect="auto",
            interpolation="nearest",
            cmap=panel_cmap,
            vmin=0,
            vmax=1,
        )
        _ax.set_ylabel("Player")
        _ax.set_title(_action_name)
        _ax.set_yticks(range(0, NUM_PLAYERS, 20))
        _ax.set_yticklabels(range(0, NUM_PLAYERS, 20))

    _axes[-1].set_xlabel("Interaction step")
    _axes[-1].set_xticks(range(INTERACTIONS_PER_PLAYER))
    _axes[-1].set_xticklabels(range(1, INTERACTIONS_PER_PLAYER + 1))

    _fig.legend(
        handles=[
            Patch(facecolor="#ffffff", edgecolor="#d0d7de", label="Other action"),
            Patch(facecolor="#58a6ff", edgecolor="#30363d", label="This action"),
        ],
        loc="upper right",
        bbox_to_anchor=(0.99, 1.02),
        ncol=2,
        framealpha=0.9,
        fontsize=8,
    )
    _fig.suptitle(
        f"MMORPG menu actions ({NUM_PLAYERS} × {INTERACTIONS_PER_PLAYER})",
        y=1.01,
    )
    _fig.tight_layout()
    _fig
    return


if __name__ == "__main__":
    app.run()
