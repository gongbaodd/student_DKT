import type { ChartRow, Trade, TradeAction, TradingStats } from "../types";

export const BATTERY_CAPACITY = 100;
export const DEFAULT_TRADE_AMOUNT = 25;

export function canTrade(
  charge: number,
  action: TradeAction,
  amount: number,
  capacity = BATTERY_CAPACITY,
): boolean {
  if (amount <= 0) return false;
  if (action === "buy") return charge + amount <= capacity;
  return charge >= amount;
}

export function applyTrade(charge: number, trade: Trade): number {
  return trade.action === "buy" ? charge + trade.amount : charge - trade.amount;
}

export function computeCharge(trades: Trade[]): number {
  return trades.reduce((charge, trade) => applyTrade(charge, trade), 0);
}

export function computeChargeUpToTrade(trades: Trade[], tradeId: string): number {
  const ordered = trades
    .map((trade, index) => ({ trade, index }))
    .sort(
      (a, b) => a.trade.ts - b.trade.ts || a.index - b.index,
    );

  let charge = 0;
  for (const { trade } of ordered) {
    charge = applyTrade(charge, trade);
    if (trade.id === tradeId) return charge;
  }
  return charge;
}

export function computeStats(trades: Trade[]): TradingStats {
  let totalBuyCost = 0;
  let totalSellRevenue = 0;

  for (const trade of trades) {
    const value = trade.amount * trade.price;
    if (trade.action === "buy") totalBuyCost += value;
    else totalSellRevenue += value;
  }

  const charge = computeCharge(trades);

  return {
    charge,
    netCost: totalBuyCost - totalSellRevenue,
    totalBuyCost,
    totalSellRevenue,
    tradeCount: trades.length,
    isValidEnd: charge === 0,
  };
}

export function snapToNearestRow(
  chartRows: ChartRow[],
  ts: number,
): ChartRow | null {
  if (chartRows.length === 0 || !Number.isFinite(ts)) return null;

  let nearest = chartRows[0];
  let minDistance = Math.abs(nearest.ts - ts);

  for (const row of chartRows) {
    const distance = Math.abs(row.ts - ts);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = row;
    }
  }

  return nearest;
}

export function maxTradeAmount(
  charge: number,
  action: TradeAction,
  capacity = BATTERY_CAPACITY,
): number {
  return action === "buy" ? capacity - charge : charge;
}

export function createTrade(
  row: ChartRow,
  action: TradeAction,
  amount: number,
): Trade {
  return {
    id: `${action}-${row.ts}-${crypto.randomUUID()}`,
    ts: row.ts,
    action,
    amount,
    price: row.loadKw,
  };
}

function medianPrice(chartRows: ChartRow[]): number {
  const prices = chartRows.map((row) => row.loadKw).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 === 0
    ? (prices[mid - 1] + prices[mid]) / 2
    : prices[mid];
}

function buildDrainTrades(
  chartRows: ChartRow[],
  charge: number,
  amountStep: number,
): Trade[] {
  const trades: Trade[] = [];
  let remaining = charge;

  for (let index = chartRows.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const row = chartRows[index];
    const amount = Math.min(amountStep, remaining);
    if (amount <= 0) continue;
    trades.push(createTrade(row, "sell", amount));
    remaining -= amount;
  }

  return remaining === 0 ? trades : [];
}

export function generateRandomSolution(
  chartRows: ChartRow[],
  amountStep = DEFAULT_TRADE_AMOUNT,
  capacity = BATTERY_CAPACITY,
): Trade[] {
  if (chartRows.length === 0) return [];

  const median = medianPrice(chartRows);
  const candidateIndices = chartRows
    .map((_, index) => index)
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(80, chartRows.length))
    .sort((a, b) => a - b);

  const trades: Trade[] = [];
  let charge = 0;

  for (const index of candidateIndices) {
    const row = chartRows[index];
    const lowPrice = row.loadKw <= median;
    const highPrice = row.loadKw >= median;

    let action: TradeAction | null = null;
    if (charge === 0 && lowPrice && canTrade(charge, "buy", amountStep, capacity)) {
      action = "buy";
    } else if (
      charge >= amountStep &&
      highPrice &&
      canTrade(charge, "sell", amountStep, capacity)
    ) {
      action = "sell";
    } else if (
      charge > 0 &&
      charge < capacity &&
      Math.random() < 0.35 &&
      canTrade(charge, "buy", amountStep, capacity)
    ) {
      action = "buy";
    } else if (
      charge >= amountStep &&
      Math.random() < 0.35 &&
      canTrade(charge, "sell", amountStep, capacity)
    ) {
      action = "sell";
    }

    if (!action) continue;

    const amount = Math.min(
      amountStep,
      maxTradeAmount(charge, action, capacity),
    );
    if (amount <= 0) continue;

    trades.push(createTrade(row, action, amount));
    charge = applyTrade(charge, trades[trades.length - 1]);
  }

  if (charge === 0) return trades;

  const drainTrades = buildDrainTrades(chartRows, charge, amountStep);
  if (drainTrades.length === 0) return [];

  return [...trades, ...drainTrades];
}

export function formatMoney(value: number): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}
