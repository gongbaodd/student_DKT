import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium")


@app.cell
def _():
    from pathlib import Path

    import marimo as mo
    import matplotlib.pyplot as plt
    import pandas as pd

    DATA_DIR = Path(__file__).resolve().parent / "months"
    MONTHS_2014 = sorted(path.stem for path in DATA_DIR.glob("2014-*.csv"))
    METER_OPTIONS = ["Total (sum)", "Mean (avg)"] + [
        f"MT_{index:03d}" for index in range(1, 371)
    ]
    return DATA_DIR, METER_OPTIONS, MONTHS_2014, mo, pd, plt


@app.cell
def _(METER_OPTIONS, MONTHS_2014, mo):
    mo.md(
        """
        # Electricity usage in 2014 (kW / 15 min)

        UCI **ElectricityLoadDiagrams20112014** data split by month.
        Each row is one 15-minute interval; columns are individual meters (MT_001–MT_370).
        """
    )

    month_dropdown = mo.ui.dropdown(
        options={"All 2014": "all", **{month: month for month in MONTHS_2014}},
        value="2014-01",
        label="Month",
    )
    meter_dropdown = mo.ui.dropdown(
        options=METER_OPTIONS,
        value="Total (sum)",
        label="Series",
    )
    return meter_dropdown, month_dropdown


@app.cell
def _(meter_dropdown, mo, month_dropdown):
    mo.hstack([month_dropdown, meter_dropdown], justify="start", gap=2)
    return


@app.cell
def _(DATA_DIR, MONTHS_2014, meter_dropdown, mo, month_dropdown, pd):
    @mo.cache
    def load_month(month: str) -> pd.DataFrame:
        path = DATA_DIR / f"{month}.csv"
        return pd.read_csv(
            path,
            sep=";",
            decimal=",",
            quotechar='"',
            parse_dates=[0],
            index_col=0,
        )

    selected_month = month_dropdown.value
    if selected_month == "all":
        df = pd.concat([load_month(month) for month in MONTHS_2014])
    else:
        df = load_month(selected_month)

    selection = meter_dropdown.value
    if selection == "Total (sum)":
        usage = df.sum(axis=1)
        series_label = "Total load (kW)"
    elif selection == "Mean (avg)":
        usage = df.mean(axis=1)
        series_label = "Mean load per meter (kW)"
    else:
        usage = df[selection]
        series_label = f"{selection} (kW)"

    usage = usage.sort_index()
    return selected_month, series_label, usage


@app.cell
def _(mo, selected_month, series_label, usage):
    mo.md(f"""
    **{series_label}** · {selected_month} · {len(usage):,} intervals

    | min | mean | max |
    | ---: | ---: | ---: |
    | {usage.min():,.1f} | {usage.mean():,.1f} | {usage.max():,.1f} |
    """)
    return


@app.cell
def _(plt, selected_month, series_label, usage):
    fig, ax = plt.subplots(figsize=(12, 4))
    ax.plot(usage.index, usage.values, linewidth=0.8, color="#2563eb")
    ax.set_title(f"{series_label} — {selected_month}")
    ax.set_xlabel("Time")
    ax.set_ylabel("kW")
    ax.grid(True, alpha=0.25)
    fig.autofmt_xdate()
    fig.tight_layout()
    fig
    return


if __name__ == "__main__":
    app.run()
