import { LineChart } from "@mantine/charts";
import {
  Group,
  Paper,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { ReferenceArea } from "recharts";

import type { CalendarBand, ChartRow } from "../types";
import { chartColors } from "../theme";

interface TemperatureChartProps {
  chartRows: ChartRow[];
  calendarBands: CalendarBand[];
  holidays: { date: string; name: string }[];
}

function ChartLegend() {
  const items = [
    { color: chartColors.weekend, label: "Weekend" },
    { color: chartColors.holiday, label: "Public holiday (Portugal)" },
    { color: chartColors.temp, label: "Lisbon temperature (°C)" },
    { color: chartColors.load, label: "Total load (kW)" },
  ];

  return (
    <Group gap="md">
      {items.map((item) => (
        <Group key={item.label} gap={6}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: item.color,
              display: "inline-block",
            }}
          />
          <Text size="xs" c="dimmed">
            {item.label}
          </Text>
        </Group>
      ))}
    </Group>
  );
}

export function TemperatureChart({
  chartRows,
  calendarBands,
  holidays,
}: TemperatureChartProps) {
  const [showLoad, setShowLoad] = useState(false);

  const series = useMemo(() => {
    if (showLoad) {
      return [
        {
          name: "loadKw",
          color: chartColors.load,
          label: "Total load (kW)",
        },
        {
          name: "tempC",
          color: chartColors.temp,
          label: "Lisbon temperature (°C)",
          yAxisId: "right",
        },
      ];
    }
    return [
      {
        name: "tempC",
        color: chartColors.temp,
        label: "Lisbon temperature (°C)",
      },
    ];
  }, [showLoad]);

  return (
    <Paper p="lg" radius="md" withBorder h="100%">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Title order={4}>Lisbon temperature — June 2014</Title>
            <Text size="sm" c="dimmed">
              {chartRows.length.toLocaleString()} intervals · 15 min
            </Text>
          </Stack>
          <Switch
            label="Show electricity load"
            checked={showLoad}
            onChange={(event) => setShowLoad(event.currentTarget.checked)}
          />
        </Group>

        {holidays.length > 0 && (
          <Text size="xs" c="dimmed">
            Holidays:{" "}
            {holidays.map((h) => `${h.date} (${h.name})`).join(" · ")}
          </Text>
        )}

        <LineChart
          h={360}
          data={chartRows}
          dataKey="date"
          series={series}
          withRightYAxis={showLoad}
          yAxisLabel={showLoad ? "kW" : "°C"}
          rightYAxisLabel={showLoad ? "°C" : undefined}
          curveType="linear"
          strokeWidth={1.2}
          gridAxis="xy"
          tickLine="xy"
          withDots={false}
          xAxisProps={{
            tickFormatter: (value: string) => {
              const parts = value.split(" ");
              return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : value;
            },
            minTickGap: 48,
            interval: "preserveStartEnd",
          }}
        >
          {calendarBands.map((band) => (
            <ReferenceArea
              key={`${band.type}-${band.x1}`}
              x1={band.x1}
              x2={band.x2}
              fill={band.type === "holiday" ? chartColors.holiday : chartColors.weekend}
              fillOpacity={band.type === "holiday" ? 0.12 : 0.1}
              strokeOpacity={0}
              ifOverflow="extendDomain"
            />
          ))}
        </LineChart>

        <ChartLegend />
      </Stack>
    </Paper>
  );
}
