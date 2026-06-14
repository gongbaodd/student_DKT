/**
 * Price oracle for buy/hold/sell grading.
 * Must match electricity_dkt_generator.py oracle_action().
 */

import type { ChartRow, Trade } from "../types";
import type { SkillId, TradingAction } from "../dkt/types";
import { dayKey } from "./dateTime";

export function buildDayPriceRanks(chartRows: ChartRow[]): Map<number, number> {
  const byDay = new Map<string, Array<{ index: number; price: number }>>();

  chartRows.forEach((row, index) => {
    const day = dayKey(row.timestamp);
    const entries = byDay.get(day) ?? [];
    entries.push({ index, price: row.loadKw });
    byDay.set(day, entries);
  });

  const ranks = new Map<number, number>();
  for (const dayRows of byDay.values()) {
    const sorted = [...dayRows].sort((a, b) => a.price - b.price);
    const count = sorted.length;
    if (count === 1) {
      ranks.set(sorted[0].index, 0.5);
      continue;
    }
    sorted.forEach(({ index }, rank) => {
      ranks.set(index, rank / (count - 1));
    });
  }

  return ranks;
}

export function oracleAction(
  charge: number,
  priceRank: number,
  amountStep: number,
): TradingAction {
  if (charge === 0 && priceRank <= 0.25) return "buy";
  if (charge >= amountStep && priceRank >= 0.75) return "sell";
  return "hold";
}

export function actionToSkillId(action: TradingAction): SkillId {
  if (action === "buy") return 0;
  if (action === "sell") return 2;
  return 1;
}

export function skillIdToAction(skillId: SkillId): TradingAction {
  if (skillId === 0) return "buy";
  if (skillId === 2) return "sell";
  return "hold";
}

export function actualActionAtTs(trades: Trade[], ts: number): TradingAction {
  const trade = trades.find((entry) => entry.ts === ts);
  if (!trade) return "hold";
  return trade.action;
}

export function gradeAction(actual: TradingAction, optimal: TradingAction): boolean {
  return actual === optimal;
}

export function priceQuartileLabel(priceRank: number): string {
  if (priceRank <= 0.25) return "Q1 (low)";
  if (priceRank <= 0.5) return "Q2";
  if (priceRank <= 0.75) return "Q3";
  return "Q4 (high)";
}
