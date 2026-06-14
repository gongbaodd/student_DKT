import {
  AppShell,
  Box,
  Container,
  Flex,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { BatteryIconPanel } from "./components/BatteryIconPanel";
import { TemperatureChart } from "./components/TemperatureChart";
import { TradingCostPanel } from "./components/TradingCostPanel";
import { useBatteryTrading } from "./hooks/useBatteryTrading";
import { useElectricityMonth } from "./hooks/useElectricityMonth";

function AppHeader() {
  return (
    <AppShell.Header
      style={{
        background: "var(--mantine-color-gray-0)",
        borderBottom: "1px solid var(--mantine-color-gray-3)",
      }}
    >
      <Container fluid h="100%" px="md">
        <Stack justify="center" h="100%" gap={0}>
          <Title order={3}>Battery Agent Measurement Demo</Title>
          <Text size="xs" c="dimmed">
            Battery arbitrage on June 2014 · Lisbon temperature chart
          </Text>
        </Stack>
      </Container>
    </AppShell.Header>
  );
}

export default function App() {
  const { data, chartRows, calendarBands, peakBands, isLoading, error } =
    useElectricityMonth();
  const trading = useBatteryTrading(chartRows);
  const selectedTrade =
    trading.selectedTradeId === null
      ? null
      : trading.trades.find((trade) => trade.id === trading.selectedTradeId) ??
        null;

  if (error) {
    return (
      <AppShell header={{ height: 64 }} padding="md">
        <AppHeader />
        <AppShell.Main style={{ background: "var(--mantine-color-gray-0)" }}>
          <Container fluid py="xl" px="md">
            <Text c="red">Failed to load: {error}</Text>
          </Container>
        </AppShell.Main>
      </AppShell>
    );
  }

  if (isLoading || !data) {
    return (
      <AppShell header={{ height: 64 }} padding="md">
        <AppHeader />
        <AppShell.Main style={{ background: "var(--mantine-color-gray-0)" }}>
          <Container fluid py="xl" px="md">
            <Stack align="center" gap="md">
              <Loader color="blue" />
              <Text c="dimmed">Loading June 2014 data…</Text>
            </Stack>
          </Container>
        </AppShell.Main>
      </AppShell>
    );
  }

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppHeader />
      <AppShell.Main style={{ background: "var(--mantine-color-gray-0)" }}>
        <Container fluid px="md">
          <Flex
            gap="lg"
            align="stretch"
            direction={{ base: "column", sm: "row" }}
          >
            <Box w={{ base: "100%", sm: 260 }} style={{ flexShrink: 0 }}>
              <BatteryIconPanel
                stats={trading.stats}
                capacity={trading.capacity}
                amount={trading.amount}
                selectedTs={trading.selectedTs}
                selectedTradeId={trading.selectedTradeId}
                selectedTrade={selectedTrade}
                chargeAtSelection={trading.chargeAtSelection}
                maxBuyAmount={trading.maxBuyAmount}
                onAmountChange={trading.setAmount}
                onAddTrade={trading.addTrade}
                onRemoveTrade={trading.removeTrade}
              />
            </Box>
            <Stack style={{ flex: 1, minWidth: 0 }} gap="lg">
              <TemperatureChart
                chartRows={chartRows}
                calendarBands={calendarBands}
                peakBands={peakBands}
                holidays={data.holidays}
                trades={trading.trades}
                selectedTs={trading.selectedTs}
                selectedTradeId={trading.selectedTradeId}
                onSelectInterval={trading.selectInterval}
                onSelectTrade={trading.selectTrade}
              />
              <TradingCostPanel
                trades={trading.trades}
                stats={trading.stats}
                selectedTradeId={trading.selectedTradeId}
                capacity={trading.capacity}
                onSelectTrade={trading.selectTrade}
                onRandomGenerate={trading.randomGenerate}
                onClearTrades={trading.clearTrades}
              />
            </Stack>
          </Flex>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
