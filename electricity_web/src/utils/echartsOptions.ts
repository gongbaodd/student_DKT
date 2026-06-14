import type { EChartsOption, LineSeriesOption } from "echarts";

import type { CalendarBand, ChartRow, PeakBand, Trade } from "../types";
import { chartColors } from "../theme";
import { formatAxisDate } from "./dateTime";

interface MarkAreaBand {
  x1: number;
  x2: number;
  color: string;
}

interface BuildEchartsOptionParams {
  chartRows: ChartRow[];
  calendarBands: CalendarBand[];
  peakBands: PeakBand[];
  trades: Trade[];
  selectedTs: number | null;
  selectedTradeId: string | null;
  showLoadDebug: boolean;
}

function rgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildMarkAreaData(
  peakBands: PeakBand[],
  calendarBands: CalendarBand[],
): MarkAreaBand[] {
  const peaks: MarkAreaBand[] = peakBands.map((band) => ({
    x1: band.x1,
    x2: band.x2,
    color:
      band.kind === "morning"
        ? rgba(chartColors.morningPeak, 0.12)
        : rgba(chartColors.eveningPeak, 0.12),
  }));

  const weekends: MarkAreaBand[] = calendarBands
    .filter((band) => band.type === "weekend")
    .map((band) => ({
      x1: band.x1,
      x2: band.x2,
      color: rgba(chartColors.weekend, 0.08),
    }));

  const holidays: MarkAreaBand[] = calendarBands
    .filter((band) => band.type === "holiday")
    .map((band) => ({
      x1: band.x1,
      x2: band.x2,
      color: rgba(chartColors.holiday, 0.1),
    }));

  return [...peaks, ...weekends, ...holidays];
}

function legendOnlySeries(name: string, color: string): LineSeriesOption {
  return {
    name,
    type: "line",
    data: [],
    symbol: "none",
    lineStyle: { width: 0 },
    itemStyle: { color },
    tooltip: { show: false },
    legendHoverLink: false,
    silent: true,
    z: 0,
  };
}

function buildTradeMarkPoints(
  trades: Trade[],
  chartRows: ChartRow[],
  selectedTs: number | null,
  selectedTradeId: string | null,
) {
  const tempByTs = new Map(chartRows.map((row) => [row.ts, row.tempC]));
  const points: Array<{
    name: string;
    tradeId: string;
    coord: [number, number];
    symbol: string;
    symbolSize: number;
    itemStyle: { color: string; borderColor: string; borderWidth: number };
  }> = trades.map((trade) => {
    const isSelected = trade.id === selectedTradeId;
    return {
      name: trade.id,
      tradeId: trade.id,
      coord: [trade.ts, tempByTs.get(trade.ts) ?? 0] as [number, number],
      symbol: "circle",
      symbolSize: isSelected ? 14 : 10,
      itemStyle: {
        color: trade.action === "buy" ? chartColors.buy : chartColors.sell,
        borderColor: isSelected ? "#334155" : "#ffffff",
        borderWidth: isSelected ? 3 : 1,
      },
    };
  });

  if (
    selectedTs !== null &&
    selectedTradeId === null &&
    tempByTs.has(selectedTs)
  ) {
    points.push({
      name: "pending",
      tradeId: "",
      coord: [selectedTs, tempByTs.get(selectedTs) ?? 0] as [number, number],
      symbol: "diamond",
      symbolSize: 12,
      itemStyle: {
        color: "#64748b",
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    });
  }

  return points;
}

export function buildEchartsOption({
  chartRows,
  calendarBands,
  peakBands,
  trades,
  selectedTs,
  selectedTradeId,
  showLoadDebug,
}: BuildEchartsOptionParams): EChartsOption {
  const tempData = chartRows.map((row) => [row.ts, row.tempC]);
  const priceData = chartRows.map((row) => [row.ts, row.loadKw]);
  const markAreaData = buildMarkAreaData(peakBands, calendarBands);
  const tradeMarkPoints = buildTradeMarkPoints(
    trades,
    chartRows,
    selectedTs,
    selectedTradeId,
  );

  const legendData = [
    "Lisbon temperature (°C)",
    "Buy",
    "Sell",
    ...(showLoadDebug ? ["Electricity load (debug kW)"] : []),
    "Weekend",
    "Public holiday (Portugal)",
    "Morning peak (07:30–09:30)",
    "Evening peak (17:30–19:30)",
  ];

  const series: LineSeriesOption[] = [
    legendOnlySeries("Weekend", rgba(chartColors.weekend, 0.5)),
    legendOnlySeries("Public holiday (Portugal)", rgba(chartColors.holiday, 0.5)),
    legendOnlySeries("Morning peak (07:30–09:30)", rgba(chartColors.morningPeak, 0.5)),
    legendOnlySeries("Evening peak (17:30–19:30)", rgba(chartColors.eveningPeak, 0.5)),
    legendOnlySeries("Buy", chartColors.buy),
    legendOnlySeries("Sell", chartColors.sell),
    {
      name: "Lisbon temperature (°C)",
      type: "line",
      yAxisIndex: 0,
      showSymbol: false,
      lineStyle: { width: 1.2, color: chartColors.temp },
      itemStyle: { color: chartColors.temp },
      label: { show: false },
      data: tempData,
      z: 3,
      markPoint: {
        symbol: "circle",
        symbolSize: 10,
        label: { show: false },
        data: tradeMarkPoints as NonNullable<LineSeriesOption["markPoint"]>["data"],
      },
      markArea: {
        silent: true,
        label: { show: false },
        itemStyle: { opacity: 1 },
        data: markAreaData.map((band) => [
          {
            xAxis: band.x1,
            itemStyle: { color: band.color },
          },
          { xAxis: band.x2 },
        ]),
      },
    },
  ];

  if (showLoadDebug) {
    series.push({
      name: "Electricity load (debug kW)",
      type: "line",
      yAxisIndex: 1,
      showSymbol: false,
      lineStyle: { width: 1, color: chartColors.load, type: "dashed" },
      itemStyle: { color: chartColors.load },
      label: { show: false },
      data: priceData,
      z: 2,
    });
  }

  const yAxis: EChartsOption["yAxis"] = showLoadDebug
    ? [
        {
          type: "value",
          name: "°C",
          nameTextStyle: { color: chartColors.temp },
          axisLabel: { color: chartColors.temp },
          splitLine: { lineStyle: { color: "#e5e7eb", opacity: 0.6 } },
        },
        {
          type: "value",
          name: "kW",
          nameTextStyle: { color: chartColors.load },
          axisLabel: { color: chartColors.load },
          splitLine: { show: false },
        },
      ]
    : [
        {
          type: "value",
          name: "°C",
          nameTextStyle: { color: chartColors.temp },
          axisLabel: { color: chartColors.temp },
          splitLine: { lineStyle: { color: "#e5e7eb", opacity: 0.6 } },
        },
      ];

  return {
    animation: false,
    grid: { left: 56, right: showLoadDebug ? 56 : 24, top: 16, bottom: 48 },
    tooltip: { show: false },
    legend: {
      bottom: 0,
      data: legendData,
      textStyle: { fontSize: 11, color: "#64748b" },
      itemWidth: 12,
      itemHeight: 8,
    },
    xAxis: {
      type: "time",
      axisLabel: {
        formatter: (value: number) => formatAxisDate(value),
        color: "#64748b",
        fontSize: 11,
      },
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      splitLine: { show: true, lineStyle: { color: "#e5e7eb", opacity: 0.35 } },
    },
    yAxis,
    series,
  };
}
