import {
  Badge,
  Button,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconCoin } from "@tabler/icons-react";

import { chartColors } from "../theme";
import type { Trade, TradingStats } from "../types";
import {
  buildTradeTimeline,
  formatMoney,
  formatPrice,
} from "../utils/batteryTrading";
import { formatIntervalTs } from "../utils/dateTime";

interface TradingCostPanelProps {
  trades: Trade[];
  stats: TradingStats;
  selectedTradeId: string | null;
  capacity: number;
  onSelectTrade: (tradeId: string) => void;
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
  trades,
  stats,
  selectedTradeId,
  capacity,
  onSelectTrade,
  onRandomGenerate,
  onClearTrades,
}: TradingCostPanelProps) {
  const timeline = buildTradeTimeline(trades);

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

        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Trade timeline
          </Text>
          <Text size="xs" c="dimmed">
            Battery status after each trade in chronological order
          </Text>

          {timeline.length === 0 ? (
            <Text size="sm" c="dimmed">
              No trades yet. Add trades on the chart or generate a random
              solution.
            </Text>
          ) : (
            <ScrollArea.Autosize mah={280} type="auto">
              <Table
                striped
                highlightOnHover
                withTableBorder
                withColumnBorders
                verticalSpacing="xs"
                fz="sm"
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40}>#</Table.Th>
                    <Table.Th>Time</Table.Th>
                    <Table.Th>Action</Table.Th>
                    <Table.Th ta="right">Amount</Table.Th>
                    <Table.Th ta="right">
                      <Group justify="flex-end" gap={4} wrap="nowrap">
                        <IconCoin size={14} stroke={1.5} aria-hidden />
                        <span>Price</span>
                      </Group>
                    </Table.Th>
                    <Table.Th ta="right">Battery</Table.Th>
                    <Table.Th ta="right">Flow</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {timeline.map((entry, index) => {
                    const { trade, chargeAfter, tradeValue } = entry;
                    const isSelected = trade.id === selectedTradeId;
                    const isBuy = trade.action === "buy";
                    const flowColor = isBuy ? chartColors.sell : chartColors.buy;

                    return (
                      <Table.Tr
                        key={trade.id}
                        onClick={() => onSelectTrade(trade.id)}
                        style={{
                          cursor: "pointer",
                          backgroundColor: isSelected
                            ? "var(--mantine-color-blue-0)"
                            : undefined,
                        }}
                      >
                        <Table.Td c="dimmed">{index + 1}</Table.Td>
                        <Table.Td>{formatIntervalTs(trade.ts)}</Table.Td>
                        <Table.Td>
                          <Badge
                            color={trade.action === "buy" ? "green" : "red"}
                            variant="light"
                            size="sm"
                          >
                            {trade.action}
                          </Badge>
                        </Table.Td>
                        <Table.Td ta="right">{trade.amount}</Table.Td>
                        <Table.Td ta="right" c="dimmed">
                          <Group justify="flex-end" gap={4} wrap="nowrap">
                            <IconCoin size={14} stroke={1.5} aria-hidden />
                            <span>{formatPrice(trade.price)}</span>
                          </Group>
                        </Table.Td>
                        <Table.Td ta="right" fw={500}>
                          {chargeAfter} / {capacity}
                        </Table.Td>
                        <Table.Td ta="right" c={flowColor} fw={500}>
                          {isBuy
                            ? `−${formatMoney(tradeValue)}`
                            : `+${formatMoney(tradeValue)}`}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
