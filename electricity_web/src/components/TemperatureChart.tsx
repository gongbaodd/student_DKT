import { Group, Paper, Stack, Switch, Text, Title } from "@mantine/core";
import type { ECharts } from "echarts";
import ReactECharts from "echarts-for-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CalendarBand, ChartRow, PeakBand, Trade } from "../types";
import { buildEchartsOption } from "../utils/echartsOptions";

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
  const markPointClickAtRef = useRef(0);

  intervalHandlerRef.current = onSelectInterval;
  tradeHandlerRef.current = onSelectTrade;

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
      if (params.componentType === "markPoint") {
        const tradeId = (params.data as { tradeId?: string }).tradeId;
        if (tradeId) {
          markPointClickAtRef.current = Date.now();
          tradeHandlerRef.current(tradeId);
          return;
        }
      }
    });

    chart.getZr().off("click");
    chart.getZr().on("click", (event) => {
      if (Date.now() - markPointClickAtRef.current < 100) return;

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
