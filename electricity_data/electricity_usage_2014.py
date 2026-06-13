import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium")


@app.cell
def _():
    from pathlib import Path

    import holidays
    import marimo as mo
    import matplotlib.pyplot as plt
    import pandas as pd

    DATA_DIR = Path(__file__).resolve().parent / "months"
    LISBON_TEMP_FILE = Path(__file__).resolve().parent / "lisbon_temperature_2014.csv"
    PORTUGAL_HOLIDAYS = holidays.Portugal(years=2014)
    MONTHS_2014 = sorted(path.stem for path in DATA_DIR.glob("2014-*.csv"))
    METER_OPTIONS = ["Total (sum)", "Mean (avg)"] + [
        f"MT_{index:03d}" for index in range(1, 371)
    ]
    MORNING_PEAK = ("07:30", "09:30")
    EVENING_PEAK = ("17:30", "19:30")
    PEAK_INTERVAL = pd.Timedelta(minutes=15)
    return (
        DATA_DIR,
        EVENING_PEAK,
        LISBON_TEMP_FILE,
        METER_OPTIONS,
        MONTHS_2014,
        MORNING_PEAK,
        PEAK_INTERVAL,
        PORTUGAL_HOLIDAYS,
        mo,
        pd,
        plt,
    )


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
def _(
    DATA_DIR,
    LISBON_TEMP_FILE,
    MONTHS_2014,
    meter_dropdown,
    mo,
    month_dropdown,
    pd,
):
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

    @mo.cache
    def load_lisbon_temperature(temp_path) -> pd.Series:
        if not temp_path.is_file():
            raise FileNotFoundError(
                f"Lisbon temperature file not found: {temp_path}. "
                "Run electricity_data/download_lisbon_weather.py first."
            )
        series = pd.read_csv(
            temp_path,
            parse_dates=["timestamp"],
            index_col="timestamp",
        )["temperature_c"]
        return series.sort_index()

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

    temperature_hourly = load_lisbon_temperature(LISBON_TEMP_FILE)
    temperature = (
        temperature_hourly.reindex(usage.index.union(temperature_hourly.index))
        .sort_index()
        .interpolate("time")
        .loc[usage.index]
    )
    return selected_month, series_label, temperature, usage


@app.cell
def _(pd):
    def _time_offset(time_str: str) -> pd.Timedelta:
        return pd.Timestamp(f"2000-01-01 {time_str}") - pd.Timestamp("2000-01-01")

    def shade_working_peaks(ax, index, morning, evening, interval):
        morning_start, morning_end = morning
        evening_start, evening_end = evening
        morning_end_offset = _time_offset(morning_end) + interval
        evening_end_offset = _time_offset(evening_end) + interval

        for day_index, day in enumerate(index.normalize().unique()):
            morning_label = "Morning peak (07:30–09:30)" if day_index == 0 else None
            evening_label = "Evening peak (17:30–19:30)" if day_index == 0 else None
            ax.axvspan(
                day + _time_offset(morning_start),
                day + morning_end_offset,
                alpha=0.12,
                color="#f59e0b",
                zorder=0,
                label=morning_label,
            )
            ax.axvspan(
                day + _time_offset(evening_start),
                day + evening_end_offset,
                alpha=0.12,
                color="#8b5cf6",
                zorder=0,
                label=evening_label,
            )

    def shade_weekends_and_holidays(ax, index, holiday_calendar):
        one_day = pd.Timedelta(days=1)
        weekend_labeled = False
        holiday_labeled = False

        for day in index.normalize().unique():
            day_date = day.date()
            if day_date in holiday_calendar:
                ax.axvspan(
                    day,
                    day + one_day,
                    alpha=0.10,
                    color="#ef4444",
                    zorder=-1,
                    label="Public holiday (Portugal)" if not holiday_labeled else None,
                )
                holiday_labeled = True
            elif day.dayofweek >= 5:
                ax.axvspan(
                    day,
                    day + one_day,
                    alpha=0.08,
                    color="#94a3b8",
                    zorder=-1,
                    label="Weekend" if not weekend_labeled else None,
                )
                weekend_labeled = True

    return shade_weekends_and_holidays, shade_working_peaks


@app.cell
def _(PORTUGAL_HOLIDAYS, mo, selected_month, series_label, temperature, usage):
    visible_days = usage.index.normalize().unique()
    holiday_rows = [
        f"| {day.strftime('%Y-%m-%d')} | {PORTUGAL_HOLIDAYS[day.date()]} |"
        for day in visible_days
        if day.date() in PORTUGAL_HOLIDAYS
    ]
    if holiday_rows:
        holidays_table = (
            "| date | holiday |\n| --- | --- |\n" + "\n".join(holiday_rows)
        )
    else:
        holidays_table = "No public holidays in this period."

    mo.md(f"""
    **{series_label}** · **Lisbon temperature** · {selected_month} · {len(usage):,} intervals

    | load min | load mean | load max | temp min | temp mean | temp max |
    | ---: | ---: | ---: | ---: | ---: | ---: |
    | {usage.min():,.1f} kW | {usage.mean():,.1f} kW | {usage.max():,.1f} kW | {temperature.min():,.1f} °C | {temperature.mean():,.1f} °C | {temperature.max():,.1f} °C |

    **Portuguese public holidays in this period**

    {holidays_table}
    """)
    return


@app.cell
def _(
    EVENING_PEAK,
    MORNING_PEAK,
    PEAK_INTERVAL,
    PORTUGAL_HOLIDAYS,
    plt,
    selected_month,
    series_label,
    shade_weekends_and_holidays,
    shade_working_peaks,
    temperature,
    usage,
):
    _fig, _ax = plt.subplots(figsize=(12, 4))
    shade_weekends_and_holidays(_ax, usage.index, PORTUGAL_HOLIDAYS)
    shade_working_peaks(_ax, usage.index, MORNING_PEAK, EVENING_PEAK, PEAK_INTERVAL)
    _ax.plot(
        usage.index,
        usage.values,
        linewidth=0.8,
        color="#2563eb",
        label=series_label,
        zorder=2,
    )
    _ax.set_xlabel("Time")
    _ax.set_ylabel("kW", color="#2563eb")
    _ax.tick_params(axis="y", labelcolor="#2563eb")

    _ax_temp = _ax.twinx()
    _ax_temp.plot(
        temperature.index,
        temperature.values,
        linewidth=0.8,
        color="#dc2626",
        label="Lisbon temperature (°C)",
        zorder=2,
    )
    _ax_temp.set_ylabel("°C", color="#dc2626")
    _ax_temp.tick_params(axis="y", labelcolor="#dc2626")

    _lines, _labels = _ax.get_legend_handles_labels()
    _temp_lines, _temp_labels = _ax_temp.get_legend_handles_labels()
    _ax.legend(
        _lines + _temp_lines,
        _labels + _temp_labels,
        loc="upper right",
        fontsize=7,
        ncol=2,
    )

    _ax.set_title(f"{series_label} & Lisbon temperature — {selected_month}")
    _ax.grid(True, alpha=0.25)
    _fig.autofmt_xdate()
    _fig.tight_layout()
    _fig
    return


if __name__ == "__main__":
    app.run()
