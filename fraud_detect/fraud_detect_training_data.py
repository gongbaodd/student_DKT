import marimo

__generated_with = "0.23.9"
app = marimo.App(width="full")


@app.cell
def _():
    import os
    import sys
    from pathlib import Path

    import matplotlib.pyplot as plt

    repo_root = Path(__file__).resolve().parent.parent
    os.chdir(repo_root)
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))

    from fraud_detect.config import MIN_SEQUENCE_LEN, NUM_SKILLS
    from fraud_detect.load_data import load_train
    from fraud_detect.sequences import build_sequence_steps, sequence_stats
    from fraud_detect.skills import assign_skills, build_skill_map

    return (
        MIN_SEQUENCE_LEN,
        NUM_SKILLS,
        assign_skills,
        build_sequence_steps,
        build_skill_map,
        load_train,
        plt,
        sequence_stats,
    )


@app.cell
def _(assign_skills, load_train):
    import marimo as mo

    @mo.cache
    def load_prepared_train():
        df = load_train()
        return assign_skills(df)

    return load_prepared_train, mo


@app.cell
def _(
    MIN_SEQUENCE_LEN,
    NUM_SKILLS,
    build_sequence_steps,
    load_prepared_train,
    mo,
    sequence_stats,
):
    df = load_prepared_train()
    steps = build_sequence_steps(df)
    stats = sequence_stats(steps)

    rows = len(df)
    users = df["user_id"].nunique()
    fraud_rate = df["isFraud"].mean()
    identity_rate = df["has_identity"].mean() if "has_identity" in df.columns else 0.0

    mo.md(f"""
    # IEEE-CIS fraud training data

    **{rows:,}** transactions across **{users:,}** cardholders (`card1` + `addr1`).
    Population fraud rate: **{fraud_rate:.3%}**; identity features present on
    **{identity_rate:.1%}** of rows.

    DKT sequences: **{stats["steps"]:,}** steps from **{stats["users"]:,}** users
    (≥{MIN_SEQUENCE_LEN} transactions each), sequence fraud rate **{stats["fraud_rate"]:.3%}**.

    Skills: **{NUM_SKILLS}** buckets (`ProductCD` × amount quartile).
    """)
    return df, fraud_rate, identity_rate, rows, stats, steps, users


@app.cell
def _(build_skill_map, df, fraud_rate, mo):
    skill_map = build_skill_map()
    skill_labels = skill_map["skills"]

    skill_counts = (
        df.groupby("skill_id", as_index=False)
        .agg(
            total=("TransactionID", "count"),
            fraud=("isFraud", "sum"),
        )
        .sort_values("skill_id")
    )
    skill_counts["legit"] = skill_counts["total"] - skill_counts["fraud"]

    print("Per-skill transaction counts:")
    for _, row in skill_counts.iterrows():
        label = skill_labels[int(row["skill_id"])]
        print(
            f"  {label}: {int(row['total']):,} "
            f"({int(row['fraud']):,} fraud, {int(row['legit']):,} legit)"
        )

    mo.md(f"""
    ## Skill distribution ({len(skill_labels)} skills)

    Stacked column chart: **legit** (green) vs **fraud** (red) per skill.
    Overall fraud rate: **{fraud_rate:.3%}**.
    """)
    return skill_counts, skill_labels


@app.cell
def _(plt, skill_counts, skill_labels):
    x = range(len(skill_labels))
    legit = skill_counts["legit"].tolist()
    fraud = skill_counts["fraud"].tolist()

    _fig, _ax = plt.subplots(figsize=(14, 5))
    _ax.bar(x, legit, label="Legit", color="#39d353")
    _ax.bar(x, fraud, bottom=legit, label="Fraud", color="#f85149")
    _ax.set_xticks(list(x))
    _ax.set_xticklabels(skill_labels, rotation=45, ha="right")
    _ax.set_xlabel("Skill (ProductCD × amount quartile)")
    _ax.set_ylabel("Transactions")
    _ax.set_title("Training transactions by DKT skill")
    _ax.legend(loc="upper right")
    _fig.tight_layout()
    _fig
    return


@app.cell
def _(MIN_SEQUENCE_LEN, df, mo):
    txn_counts = df.groupby("user_id").size()
    hist = txn_counts.value_counts().sort_index()
    single_tx_users = int((txn_counts == 1).sum())
    median_txns = float(txn_counts.median())
    max_txns = int(txn_counts.max())
    max_display = min(30, max_txns)

    max_tx_slider = mo.ui.slider(
        start=5,
        stop=min(100, max_txns),
        value=max_display,
        step=1,
        label="Show transaction counts up to",
        show_value=True,
    )

    mo.vstack(
        [
            mo.md(f"""
    ## Cardholders by transaction count

    Each bar answers: **N transactions → how many cardholders?**
    Example: **1 transaction → {single_tx_users:,} people**, **2 transactions → {int(hist.get(2, 0)):,} people**.

    Median: **{median_txns:.0f}** transactions per cardholder; max: **{max_txns:,}**.
    **{single_tx_users:,}** cardholders have only 1 transaction and are excluded from DKT
    (`MIN_SEQUENCE_LEN = {MIN_SEQUENCE_LEN}`).
    """),
            max_tx_slider,
        ]
    )
    return (
        hist,
        max_display,
        max_tx_slider,
        max_txns,
        median_txns,
        single_tx_users,
        txn_counts,
    )


@app.cell
def _(hist, max_tx_slider, mo):
    cap = int(max_tx_slider.value)
    table_rows = [
        {
            "transactions": int(txn_count),
            "cardholders": int(people),
        }
        for txn_count, people in hist.items()
        if int(txn_count) <= cap
    ]

    print("Transactions → cardholders:")
    for _row in table_rows[:20]:
        print(f"  {_row['transactions']} tx → {_row['cardholders']:,} people")
    if len(table_rows) > 20:
        print(f"  ... ({len(table_rows) - 20} more rows in table)")

    mo.ui.table(table_rows, label=f"Counts for 1–{cap} transactions per cardholder")
    return cap, table_rows


@app.cell
def _(cap, hist, max_txns, median_txns, plt, txn_counts):
    visible = hist[hist.index <= cap]

    _fig, _ax = plt.subplots(figsize=(12, 5))
    _ax.bar(
        visible.index.astype(int),
        visible.values,
        color="#58a6ff",
        edgecolor="#30363d",
    )
    _ax.set_xlabel("Transactions per cardholder (N)")
    _ax.set_ylabel("Number of cardholders (people)")
    _ax.set_title(f"N transactions → how many cardholders? (1–{cap} of max {max_txns:,})")
    _ax.set_xticks(visible.index.astype(int))
    _ax.axvline(
        txn_counts.median(),
        color="#f0883e",
        linestyle="--",
        linewidth=1.5,
        label=f"Median ({median_txns:.0f} tx)",
    )
    _ax.legend(loc="upper right")
    _fig.tight_layout()
    _fig
    return


if __name__ == "__main__":
    app.run()
