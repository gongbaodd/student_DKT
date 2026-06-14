import { Group, Paper, Stack, Switch, Text, Title } from "@mantine/core";
import type { ECharts } from "echarts";
import ReactECharts from "echarts-for-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CalendarBand, ChartRow, PeakBand, Trade } from "../types";
import { buildEchartsOption } from "../utils/echartsOptions";

const TEMP_SERIES_NAME = "Lisbon temperature (°C)";
const MARK_POINT_HIT_RADIUS = 14;

function findTradeAtClick(
  chart: ECharts,
  trades: Trade[],
  chartRows: ChartRow[],
  offsetX: number,
  offsetY: number,
): Trade | null {
  const tempByTs = new Map(chartRows.map((row) => [row.ts, row.tempC]));

  for (let index = trades.length - 1; index >= 0; index -= 1) {
    const trade = trades[index];
    const tempC = tempByTs.get(trade.ts);
    if (tempC === undefined) continue;

    const pixel = chart.convertToPixel(
      { seriesName: TEMP_SERIES_NAME },
      [trade.ts, tempC],
    ) as number[] | undefined;

    if (!pixel || pixel.length < 2) continue;

    const dx = pixel[0] - offsetX;
    const dy = pixel[1] - offsetY;
    if (dx * dx + dy * dy <= MARK_POINT_HIT_RADIUS ** 2) {
      return trade;
    }
  }

  return null;
}

interface TemperatureChartProps {
  chartRows: ChartRow[];
  calendarBands: CalendarBand[];
  peakBands: PeakBand[];
  holidays: { date: string; name: string }[];
  trades: Trade[];
  selectedTs: number | null;
  selectedTradeId: string | null;
  onSelectInterval: (ts: number) => void;
  onSelectTrade: (tradeId: string) => void;
}

export function TemperatureChart({
  chartRows,
  calendarBands,
  peakBands,
  holidays,
  trades,
  selectedTs,
  selectedTradeId,
  onSelectInterval,
  onSelectTrade,
}: TemperatureChartProps) {
  const [showLoadDebug, setShowLoadDebug] = useState(false);
  const chartRef = useRef<ReactECharts>(null);
  const intervalHandlerRef = useRef(onSelectInterval);
  const tradeHandlerRef = useRef(onSelectTrade);
  const tradesRef = useRef(trades);
  const chartRowsRef = useRef(chartRows);

  intervalHandlerRef.current = onSelectInterval;
  tradeHandlerRef.current = onSelectTrade;
  tradesRef.current = trades;
  chartRowsRef.current = chartRows;

  const option = useMemo(
    () =>
      buildEchartsOption({
        chartRows,
        calendarBands,
        peakBands,
        trades,
        selectedTs,
        selectedTradeId,
        showLoadDebug,
      }),
    [
      chartRows,
      calendarBands,
      peakBands,
      trades,
      selectedTs,
      selectedTradeId,
      showLoadDebug,
    ],
  );

  const bindChartEvents = useCallback((chart: ECharts) => {
    chart.off("click");
    chart.on("click", (params) => {
      if (params.componentType !== "markPoint") return;

      const data = params.data as { tradeId?: string; name?: string };
      const tradeId = data.tradeId ?? params.name;
      if (tradeId && tradeId !== "pending") {
        tradeHandlerRef.current(tradeId);
      }
    });

    chart.getZr().off("click");
    chart.getZr().on("click", (event) => {
      const hitTrade = findTradeAtClick(
        chart,
        tradesRef.current,
        chartRowsRef.current,
        event.offsetX,
        event.offsetY,
      );

      if (hitTrade) {
        tradeHandlerRef.current(hitTrade.id);
        return;
      }

      const pointInGrid = chart.convertFromPixel({ gridIndex: 0 }, [
        event.offsetX,
        event.offsetY,
      ]);
      if (!pointInGrid) return;

      const ts = pointInGrid[0];
      if (typeof ts === "number" && Number.isFinite(ts)) {
        intervalHandlerRef.current(ts);
      }
    });
  }, []);

  const handleChartReady = useCallback(
    (chart: ECharts) => {
      bindChartEvents(chart);
    },
    [bindChartEvents],
  );

  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance();
    if (chart) bindChartEvents(chart);
  }, [bindChartEvents, option]);

  return (
    <Paper p="lg" radius="md" withBorder h="100%">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Title order={4}>Lisbon temperature — June 2014</Title>
            <Text size="sm" c="dimmed">
              Click chart to add · click a dot to inspect or remove
            </Text>
          </Stack>
          <Switch
            label="Show load (debug)"
            checked={showLoadDebug}
            onChange={(event) => setShowLoadDebug(event.currentTarget.checked)}
          />
        </Group>

        {holidays.length > 0 && (
          <Text size="xs" c="dimmed">
            Holidays:{" "}
            {holidays.map((h) => `${h.date} (${h.name})`).join(" · ")}
          </Text>
        )}

        <ReactECharts
          ref={chartRef}
          option={option}
          notMerge
          onChartReady={handleChartReady}
          style={{ height: 420, width: "100%", cursor: "crosshair" }}
          opts={{ renderer: "canvas" }}
        />
      </Stack>
    </Paper>
  );
}
