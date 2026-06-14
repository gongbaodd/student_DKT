import type { ChartRow } from "../types";
import { dayKey } from "./dateTime";

/** Must match electricity_dkt_generator.py PRICE_PERCENTILES */
const PRICE_PERCENTILES = [0.125, 0.375, 0.625, 0.875] as const;

export function buildDktSampleIndices(chartRows: ChartRow[]): number[] {
  const byDay = new Map<string, Array<{ index: number; price: number }>>();

  chartRows.forEach((row, index) => {
    const day = dayKey(row.timestamp);
    const entries = byDay.get(day) ?? [];
    entries.push({ index, price: row.loadKw });
    byDay.set(day, entries);
  });

  const indices: number[] = [];
  for (const day of [...byDay.keys()].sort()) {
    const dayRows = [...(byDay.get(day) ?? [])].sort((a, b) => a.price - b.price);
    const count = dayRows.length;
    if (count === 0) continue;

    for (const percentile of PRICE_PERCENTILES) {
      const position = Math.min(
        Math.max(Math.round(percentile * (count - 1)), 0),
        count - 1,
      );
      indices.push(dayRows[position].index);
    }
  }

  return indices.sort((a, b) => a - b);
}
