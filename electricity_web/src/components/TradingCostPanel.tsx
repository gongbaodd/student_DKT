import { Badge, Button, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";

import type { TradingStats } from "../types";
import { formatMoney } from "../utils/batteryTrading";

interface TradingCostPanelProps {
  stats: TradingStats;
  onRandomGenerate: () => void;
  onClearTrades: () => void;
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="lg" fw={600}>
        {value}
      </Text>
    </Stack>
  );
}

export function TradingCostPanel({
  stats,
  onRandomGenerate,
  onClearTrades,
}: TradingCostPanelProps) {
  const netLabel =
    stats.netCost > 0
      ? `${formatMoney(stats.netCost)} spent`
      : stats.netCost < 0
        ? `${formatMoney(Math.abs(stats.netCost))} profit`
        : "Break even";

  return (
    <Paper p="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Title order={4}>Trading cost</Title>
            <Text size="sm" c="dimmed">
              Buy cost minus sell revenue for the current solution
            </Text>
          </Stack>
          <Group gap="sm">
            <Button variant="light" onClick={onRandomGenerate}>
              Random solution
            </Button>
            <Button variant="default" onClick={onClearTrades}>
              Clear trades
            </Button>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <StatBlock label="Net cost" value={netLabel} />
          <StatBlock
            label="Buy cost"
            value={formatMoney(stats.totalBuyCost)}
          />
          <StatBlock
            label="Sell revenue"
            value={formatMoney(stats.totalSellRevenue)}
          />
          <StatBlock label="Trades" value={String(stats.tradeCount)} />
        </SimpleGrid>

        <Badge
          color={stats.isValidEnd ? "green" : "orange"}
          variant="light"
          w="fit-content"
        >
          {stats.isValidEnd
            ? "Valid end state: battery empty"
            : `Invalid end state: ${stats.charge} units remaining`}
        </Badge>
      </Stack>
    </Paper>
  );
}
