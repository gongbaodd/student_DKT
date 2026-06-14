import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChartRow, Trade, TradingStats } from "../types";
import {
  BATTERY_CAPACITY,
  DEFAULT_TRADE_AMOUNT,
  canTrade,
  computeChargeUpToTrade,
  computeStats,
  createTrade,
  generateRandomSolution,
  maxTradeAmount,
  snapToNearestRow,
} from "../utils/batteryTrading";

interface UseBatteryTradingResult {
  trades: Trade[];
  amount: number;
  selectedTs: number | null;
  selectedTradeId: string | null;
  chargeAtSelection: number | null;
  stats: TradingStats;
  maxBuyAmount: number;
  capacity: number;
  setAmount: (amount: number) => void;
  selectInterval: (ts: number) => void;
  selectTrade: (tradeId: string) => void;
  addTrade: () => boolean;
  removeTrade: () => boolean;
  randomGenerate: () => void;
  clearTrades: () => void;
}

export function useBatteryTrading(chartRows: ChartRow[]): UseBatteryTradingResult {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [amount, setAmountState] = useState(DEFAULT_TRADE_AMOUNT);
  const [selectedTs, setSelectedTs] = useState<number | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const tradesRef = useRef(trades);

  useEffect(() => {
    tradesRef.current = trades;
  }, [trades]);

  const stats = useMemo(() => computeStats(trades), [trades]);

  const maxBuyAmount = useMemo(
    () => maxTradeAmount(stats.charge, "buy", BATTERY_CAPACITY),
    [stats.charge],
  );

  const chargeAtSelection = useMemo(() => {
    if (selectedTradeId === null) return null;
    return computeChargeUpToTrade(trades, selectedTradeId);
  }, [selectedTradeId, trades]);

  useEffect(() => {
    const allowedMax = Math.max(maxBuyAmount, 1);
    if (amount > allowedMax) {
      setAmountState(Math.max(1, allowedMax));
    }
  }, [amount, maxBuyAmount]);

  const setAmount = useCallback((value: number) => {
    const charge = computeStats(tradesRef.current).charge;
    const allowedMax = Math.max(
      maxTradeAmount(charge, "buy", BATTERY_CAPACITY),
      1,
    );
    setAmountState(Math.max(1, Math.min(value, allowedMax)));
  }, []);

  const selectInterval = useCallback(
    (ts: number) => {
      const row = snapToNearestRow(chartRows, ts);
      if (!row) return;
      setSelectedTs(row.ts);
      setSelectedTradeId(null);
    },
    [chartRows],
  );

  const selectTrade = useCallback(
    (tradeId: string) => {
      const trade = tradesRef.current.find((entry) => entry.id === tradeId);
      if (!trade) return;
      setSelectedTradeId(tradeId);
      setSelectedTs(trade.ts);
    },
    [],
  );

  const addTrade = useCallback(() => {
    if (selectedTs === null) return false;

    const row = chartRows.find((entry) => entry.ts === selectedTs);
    if (!row) return false;

    const charge = computeStats(tradesRef.current).charge;
    const tradeAmount = Math.min(
      amount,
      maxTradeAmount(charge, "buy", BATTERY_CAPACITY),
    );

    if (!canTrade(charge, "buy", tradeAmount, BATTERY_CAPACITY)) {
      return false;
    }

    const trade = createTrade(row, "buy", tradeAmount);
    setTrades((current) => [...current, trade]);
    setSelectedTradeId(trade.id);
    return true;
  }, [amount, chartRows, selectedTs]);

  const removeTrade = useCallback(() => {
    if (selectedTradeId === null) return false;

    setTrades((current) =>
      current.filter((trade) => trade.id !== selectedTradeId),
    );
    setSelectedTradeId(null);
    return true;
  }, [selectedTradeId]);

  const randomGenerate = useCallback(() => {
    const solution = generateRandomSolution(chartRows, amount, BATTERY_CAPACITY);
    setTrades(solution);
    setSelectedTradeId(null);
    setSelectedTs(null);
  }, [amount, chartRows]);

  const clearTrades = useCallback(() => {
    setTrades([]);
    setSelectedTs(null);
    setSelectedTradeId(null);
  }, []);

  return {
    trades,
    amount,
    selectedTs,
    selectedTradeId,
    chargeAtSelection,
    stats,
    maxBuyAmount,
    capacity: BATTERY_CAPACITY,
    setAmount,
    selectInterval,
    selectTrade,
    addTrade,
    removeTrade,
    randomGenerate,
    clearTrades,
  };
}
