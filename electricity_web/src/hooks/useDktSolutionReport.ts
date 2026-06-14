import { useEffect, useState } from "react";

import { DktModel } from "../dkt/model";
import type { ChartRow, Trade, TradingStats } from "../types";
import { DEFAULT_TRADE_AMOUNT } from "../utils/batteryTrading";
import { buildSolutionReport, type DktSolutionReport } from "../utils/dktReport";

export interface UseDktSolutionReportResult {
  isLoading: boolean;
  loadError: string | null;
  report: DktSolutionReport | null;
}

export function useDktSolutionReport(
  chartRows: ChartRow[],
  trades: Trade[],
  stats: TradingStats,
  amountStep = DEFAULT_TRADE_AMOUNT,
): UseDktSolutionReportResult {
  const [model, setModel] = useState<DktModel | null>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [report, setReport] = useState<DktSolutionReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const canReport = stats.isValidEnd && trades.length > 0 && chartRows.length > 0;

  useEffect(() => {
    let cancelled = false;

    async function loadModel() {
      setModelLoading(true);
      setLoadError(null);
      try {
        const dkt = await DktModel.load();
        if (!cancelled) setModel(dkt);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load DKT model",
          );
        }
      } finally {
        if (!cancelled) setModelLoading(false);
      }
    }

    void loadModel();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!model || !canReport) {
      setReport(null);
      return;
    }

    const activeModel = model;
    let cancelled = false;

    async function computeReport() {
      setReportLoading(true);
      try {
        const nextReport = await buildSolutionReport(
          chartRows,
          trades,
          activeModel,
          amountStep,
        );
        if (!cancelled) setReport(nextReport);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to build DKT report",
          );
          setReport(null);
        }
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    }

    void computeReport();
    return () => {
      cancelled = true;
    };
  }, [model, canReport, chartRows, trades, amountStep]);

  return {
    isLoading: modelLoading || reportLoading,
    loadError,
    report: canReport ? report : null,
  };
}
