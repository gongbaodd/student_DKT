import type { CalendarBand, ChartRow, HolidayEntry } from "../types";

function formatChartDate(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const hour = d.getHours().toString().padStart(2, "0");
  const minute = d.getMinutes().toString().padStart(2, "0");
  return `${month} ${day} ${hour}:${minute}`;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function chartDateForDay(day: string, points: ChartRow[]): string | null {
  const match = points.find((row) => row.timestamp.startsWith(day));
  return match?.date ?? null;
}

function nextDayChartDate(day: string, points: ChartRow[]): string | null {
  const next = new Date(`${day}T00:00:00`);
  next.setDate(next.getDate() + 1);
  const nextDay = next.toISOString().slice(0, 10);
  return chartDateForDay(nextDay, points);
}

export function toChartRows(
  points: { t: string; loadKw: number; tempC: number }[],
): ChartRow[] {
  return points.map((point) => ({
    date: formatChartDate(point.t),
    loadKw: point.loadKw,
    tempC: point.tempC,
    timestamp: point.t,
  }));
}

export function buildCalendarBands(
  chartRows: ChartRow[],
  holidays: HolidayEntry[],
): CalendarBand[] {
  const holidayDates = new Set(holidays.map((h) => h.date));

  const holidayBands: CalendarBand[] = holidays.flatMap((holiday) => {
    const x1 = chartDateForDay(holiday.date, chartRows);
    const x2 = nextDayChartDate(holiday.date, chartRows);
    if (!x1 || !x2) return [];
    return [{ type: "holiday" as const, x1, x2, label: holiday.name }];
  });

  const weekendBands: CalendarBand[] = [];
  const seenWeekends = new Set<string>();

  for (const row of chartRows) {
    const day = dayKey(row.timestamp);
    if (holidayDates.has(day) || seenWeekends.has(day)) continue;

    const weekday = new Date(`${day}T12:00:00`).getDay();
    if (weekday !== 0 && weekday !== 6) continue;

    seenWeekends.add(day);
    const x1 = chartDateForDay(day, chartRows);
    const x2 = nextDayChartDate(day, chartRows);
    if (!x1 || !x2) continue;

    weekendBands.push({ type: "weekend", x1, x2 });
  }

  return [...weekendBands, ...holidayBands];
}

export function formatKw(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} kW`;
}

export function formatTemp(value: number): string {
  return `${value.toFixed(1)} °C`;
}
