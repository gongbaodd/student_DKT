import type { ChartRow, PeakBand } from "../types";
import { dayKey, timeOnDayMs } from "./dateTime";

const INTERVAL_MINUTES = 15;

export function buildPeakBands(chartRows: ChartRow[]): PeakBand[] {
  if (chartRows.length === 0) return [];

  const uniqueDays = [...new Set(chartRows.map((row) => dayKey(row.timestamp)))];
  const bands: PeakBand[] = [];

  for (const day of uniqueDays) {
    bands.push({
      kind: "morning",
      x1: timeOnDayMs(day, 7, 30),
      x2: timeOnDayMs(day, 9, 30 + INTERVAL_MINUTES),
    });
    bands.push({
      kind: "evening",
      x1: timeOnDayMs(day, 17, 30),
      x2: timeOnDayMs(day, 19, 30 + INTERVAL_MINUTES),
    });
  }

  return bands;
}
