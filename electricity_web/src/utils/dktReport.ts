import type { DktModel } from "../dkt/model";
import type { EncodedVector, SkillId, TradingAction } from "../dkt/types";
import type { ChartRow, Trade } from "../types";
import { applyTrade } from "./batteryTrading";
import {
  actionToSkillId,
  actualActionAtTs,
  buildDayPriceRanks,
  gradeAction,
  oracleAction,
  priceQuartileLabel,
} from "./dktOracle";
import { buildDktSampleIndices } from "./dktSampling";

export interface DktReportPoint {
  ts: number;
  price: number;
  priceRank: number;
  priceQuartile: string;
  chargeBefore: number;
  actualAction: TradingAction;
  oracleAction: TradingAction;
  matched: boolean;
  predictedBuy: number;
  predictedHold: number;
  predictedSell: number;
}

export interface DktPerSkillStats {
  skillName: string;
  total: number;
  correct: number;
  predicted: number;
}

export interface DktSolutionReport {
  sampleCount: number;
  matchRate: number;
  summary: number[];
  skillNames: string[];
  perSkillStats: DktPerSkillStats[];
  points: DktReportPoint[];
}

export async function buildSolutionReport(
  chartRows: ChartRow[],
  trades: Trade[],
  model: DktModel,
  amountStep: number,
): Promise<DktSolutionReport> {
  const sampleIndices = buildDktSampleIndices(chartRows);
  const priceRanks = buildDayPriceRanks(chartRows);
  const orderedTrades = [...trades].sort((a, b) => a.ts - b.ts);

  const history: EncodedVector[] = [];
  const points: DktReportPoint[] = [];
  const perSkillTotals = model.metadata.skills.map((skillName) => ({
    skillName,
    total: 0,
    correct: 0,
    predicted: 0,
  }));

  let charge = 0;
  let tradeCursor = 0;

  for (const rowIndex of sampleIndices) {
    while (
      tradeCursor < orderedTrades.length &&
      orderedTrades[tradeCursor].ts < chartRows[rowIndex].ts
    ) {
      charge = applyTrade(charge, orderedTrades[tradeCursor]);
      tradeCursor += 1;
    }

    const row = chartRows[rowIndex];
    const priceRank = priceRanks.get(rowIndex) ?? 0.5;
    const optimal = oracleAction(charge, priceRank, amountStep);
    const actual = actualActionAtTs(trades, row.ts);
    const matched = gradeAction(actual, optimal);
    const skillId = actionToSkillId(actual);

    const prediction = await model.predictNext(history, skillId as SkillId);

    points.push({
      ts: row.ts,
      price: row.loadKw,
      priceRank,
      priceQuartile: priceQuartileLabel(priceRank),
      chargeBefore: charge,
      actualAction: actual,
      oracleAction: optimal,
      matched,
      predictedBuy: prediction.allSkills[0] ?? 0,
      predictedHold: prediction.allSkills[1] ?? 0,
      predictedSell: prediction.allSkills[2] ?? 0,
    });

    const stats = perSkillTotals[skillId];
    stats.total += 1;
    if (matched) stats.correct += 1;
    stats.predicted += prediction.allSkills[skillId] ?? 0;

    history.push(model.encode(skillId as SkillId, matched));

    while (
      tradeCursor < orderedTrades.length &&
      orderedTrades[tradeCursor].ts === row.ts
    ) {
      charge = applyTrade(charge, orderedTrades[tradeCursor]);
      tradeCursor += 1;
    }
  }

  const finalPrediction = await model.predictNext(history, 1);
  const matchedCount = points.filter((point) => point.matched).length;

  return {
    sampleCount: points.length,
    matchRate: points.length === 0 ? 0 : matchedCount / points.length,
    summary: finalPrediction.allSkills,
    skillNames: model.metadata.skills,
    perSkillStats: perSkillTotals.map((entry) => ({
      ...entry,
      predicted: entry.total === 0 ? 0 : entry.predicted / entry.total,
    })),
    points,
  };
}
