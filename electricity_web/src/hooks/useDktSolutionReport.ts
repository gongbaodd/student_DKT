import { useCallback, useEffect, useState } from "react";

import { DktModel } from "../dkt/model";
import type { ChartRow, Trade, TradingStats } from "../types";
import { DEFAULT_TRADE_AMOUNT } from "../utils/batteryTrading";
import { buildSolutionReport, type DktSolutionReport } from "../utils/dktReport";

export interface UseDktSolutionReportResult {
  modelLoading: boolean;
  reportLoading: boolean;
  loadError: string | null;
  report: DktSolutionReport | null;
  canGenerate: boolean;
  generateReport: () => void;
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
    setReport(null);
  }, [trades, stats.isValidEnd]);

  const generateReport = useCallback(() => {
    if (!model || !canReport) return;

    void (async () => {
      setReportLoading(true);
      setLoadError(null);
      try {
        const nextReport = await buildSolutionReport(
          chartRows,
          trades,
          model,
          amountStep,
        );
        setReport(nextReport);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to build DKT report",
        );
        setReport(null);
      } finally {
        setReportLoading(false);
      }
    })();
  }, [model, canReport, chartRows, trades, amountStep]);

  return {
    modelLoading,
    reportLoading,
    loadError,
    report: canReport ? report : null,
    canGenerate: canReport && model !== null && !modelLoading,
    generateReport,
  };
}
