import type { CalendarBand, ChartRow, HolidayEntry } from "../types";
import {
  dayKey,
  dayStartMs,
  formatChartDate,
  nextDayStartMs,
  parseLocalTimestamp,
  weekdayForDay,
} from "./dateTime";

export function toChartRows(
  points: { t: string; loadKw: number; tempC: number }[],
): ChartRow[] {
  return points.map((point) => ({
    date: formatChartDate(point.t),
    ts: parseLocalTimestamp(point.t),
    loadKw: point.loadKw,
    tempC: point.tempC,
    timestamp: point.t,
  }));
}

export function buildCalendarBands(
  chartRows: ChartRow[],
  holidays: HolidayEntry[],
): CalendarBand[] {
  if (chartRows.length === 0) return [];

  const holidayDates = new Set(holidays.map((h) => h.date));

  const holidayBands: CalendarBand[] = holidays.map((holiday) => ({
    type: "holiday" as const,
    x1: dayStartMs(holiday.date),
    x2: nextDayStartMs(holiday.date),
    label: holiday.name,
  }));

  const uniqueDays = [...new Set(chartRows.map((row) => dayKey(row.timestamp)))];
  const weekendBands: CalendarBand[] = uniqueDays
    .filter((day) => !holidayDates.has(day) && weekdayForDay(day) >= 5)
    .map((day) => ({
      type: "weekend" as const,
      x1: dayStartMs(day),
      x2: nextDayStartMs(day),
    }));

  return [...weekendBands, ...holidayBands];
}

export function formatKw(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} kW`;
}

export function formatTemp(value: number): string {
  return `${value.toFixed(1)} °C`;
}

export { formatAxisDate } from "./dateTime";
