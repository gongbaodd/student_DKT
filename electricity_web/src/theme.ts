import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "blue",
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  defaultRadius: "md",
});

export const chartColors = {
  buy: "#16a34a",
  sell: "#dc2626",
  load: "#2563eb",
  temp: "#dc2626",
  weekend: "#94a3b8",
  holiday: "#ef4444",
  morningPeak: "#f59e0b",
  eveningPeak: "#8b5cf6",
} as const;
