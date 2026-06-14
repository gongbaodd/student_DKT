import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChartRow, Trade, TradeAction, TradingStats } from "../types";
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
  tradeMode: TradeAction;
  selectedTs: number | null;
  selectedTradeId: string | null;
  chargeAtSelection: number | null;
  stats: TradingStats;
  maxBuyAmount: number;
  maxSellAmount: number;
  capacity: number;
  setAmount: (amount: number) => void;
  setTradeMode: (mode: TradeAction) => void;
  selectInterval: (ts: number) => void;
  selectTrade: (tradeId: string) => void;
  addTrade: () => boolean;
  removeTrade: () => boolean;
  randomGenerate: () => void;
  clearTrades: () => void;
}

function clampAmountForMode(
  value: number,
  charge: number,
  mode: TradeAction,
): number {
  const allowedMax = maxTradeAmount(charge, mode, BATTERY_CAPACITY);
  if (mode === "sell" && allowedMax <= 0) return 1;
  return Math.max(1, Math.min(value, Math.max(allowedMax, 1)));
}

export function useBatteryTrading(chartRows: ChartRow[]): UseBatteryTradingResult {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [amount, setAmountState] = useState(DEFAULT_TRADE_AMOUNT);
  const [tradeMode, setTradeModeState] = useState<TradeAction>("buy");
  const [selectedTs, setSelectedTs] = useState<number | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const tradesRef = useRef(trades);
  const tradeModeRef = useRef(tradeMode);

  useEffect(() => {
    tradesRef.current = trades;
  }, [trades]);

  useEffect(() => {
    tradeModeRef.current = tradeMode;
  }, [tradeMode]);

  const stats = useMemo(() => computeStats(trades), [trades]);

  const maxBuyAmount = useMemo(
    () => maxTradeAmount(stats.charge, "buy", BATTERY_CAPACITY),
    [stats.charge],
  );

  const maxSellAmount = useMemo(
    () => maxTradeAmount(stats.charge, "sell", BATTERY_CAPACITY),
    [stats.charge],
  );

  const chargeAtSelection = useMemo(() => {
    if (selectedTradeId === null) return null;
    return computeChargeUpToTrade(trades, selectedTradeId);
  }, [selectedTradeId, trades]);

  useEffect(() => {
    const charge = stats.charge;
    const clamped = clampAmountForMode(amount, charge, tradeMode);
    if (amount !== clamped) {
      setAmountState(clamped);
    }
  }, [amount, stats.charge, tradeMode]);

  const setAmount = useCallback((value: number) => {
    const charge = computeStats(tradesRef.current).charge;
    const mode = tradeModeRef.current;
    setAmountState(clampAmountForMode(value, charge, mode));
  }, []);

  const setTradeMode = useCallback((mode: TradeAction) => {
    setTradeModeState(mode);
    const charge = computeStats(tradesRef.current).charge;
    setAmountState((current) => clampAmountForMode(current, charge, mode));
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
      setTradeModeState(trade.action);
      const charge = computeStats(tradesRef.current).charge;
      setAmountState((current) =>
        clampAmountForMode(current, charge, trade.action),
      );
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
      maxTradeAmount(charge, tradeMode, BATTERY_CAPACITY),
    );

    if (!canTrade(charge, tradeMode, tradeAmount, BATTERY_CAPACITY)) {
      return false;
    }

    const trade = createTrade(row, tradeMode, tradeAmount);
    setTrades((current) => [...current, trade]);
    setSelectedTradeId(trade.id);
    return true;
  }, [amount, chartRows, selectedTs, tradeMode]);

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
    tradeMode,
    selectedTs,
    selectedTradeId,
    chargeAtSelection,
    stats,
    maxBuyAmount,
    maxSellAmount,
    capacity: BATTERY_CAPACITY,
    setAmount,
    setTradeMode,
    selectInterval,
    selectTrade,
    addTrade,
    removeTrade,
    randomGenerate,
    clearTrades,
  };
}
