import {
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";

import type { Trade, TradeAction, TradingStats } from "../types";
import { formatIntervalTs } from "../utils/dateTime";

interface BatteryIconPanelProps {
  stats: TradingStats;
  capacity: number;
  amount: number;
  tradeMode: TradeAction;
  selectedTs: number | null;
  selectedTradeId: string | null;
  selectedTrade: Trade | null;
  chargeAtSelection: number | null;
  maxBuyAmount: number;
  maxSellAmount: number;
  onAmountChange: (amount: number) => void;
  onTradeModeChange: (mode: TradeAction) => void;
  onAddTrade: () => void;
  onRemoveTrade: () => void;
}

export function BatteryIconPanel({
  stats,
  capacity,
  amount,
  tradeMode,
  selectedTs,
  selectedTradeId,
  selectedTrade,
  chargeAtSelection,
  maxBuyAmount,
  maxSellAmount,
  onAmountChange,
  onTradeModeChange,
  onAddTrade,
  onRemoveTrade,
}: BatteryIconPanelProps) {
  const displayCharge = chargeAtSelection ?? stats.charge;
  const chargePercent = (displayCharge / capacity) * 100;
  const isBuyMode = tradeMode === "buy";
  const maxForMode = isBuyMode ? maxBuyAmount : maxSellAmount;
  const maxAmount = Math.max(maxForMode, 1);
  const canAdd =
    selectedTs !== null &&
    maxForMode >= amount &&
    (isBuyMode || maxSellAmount > 0);
  const canRemove = selectedTradeId !== null;
  const amountDescription = isBuyMode
    ? `Buy max ${maxBuyAmount} units`
    : maxSellAmount > 0
      ? `Sell max ${maxSellAmount} units`
      : "Nothing to sell — battery is empty";

  return (
    <Paper p="lg" radius="md" withBorder h="100%">
      <Stack gap="lg" h="100%">
        <Title order={4}>Battery usage</Title>

        <Stack align="center" gap="sm">
          <Progress value={chargePercent} color="teal" size="lg" w="100%" />
          <Text size="sm" fw={500}>
            {displayCharge} / {capacity} units
          </Text>
          {selectedTrade && chargeAtSelection !== null && (
            <Text size="xs" c="dimmed" ta="center">
              Battery after {selectedTrade.action} of {selectedTrade.amount}{" "}
              units at {formatIntervalTs(selectedTrade.ts)}
            </Text>
          )}
        </Stack>

        <SegmentedControl
          value={tradeMode}
          onChange={(value) => onTradeModeChange(value as TradeAction)}
          data={[
            { label: "Buy", value: "buy" },
            { label: "Sell", value: "sell" },
          ]}
          color={isBuyMode ? "green" : "red"}
          fullWidth
        />

        <NumberInput
          label="Trade amount"
          description={amountDescription}
          value={amount}
          min={1}
          max={maxAmount}
          disabled={!isBuyMode && maxSellAmount <= 0}
          onChange={(value) => onAmountChange(Number(value) || 1)}
        />

        <Stack gap="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            Edit chart
          </Text>
          <Group grow>
            <Button
              leftSection={<IconPlus size={16} />}
              color={isBuyMode ? "green" : "red"}
              variant="light"
              disabled={!canAdd}
              onClick={onAddTrade}
            >
              Add
            </Button>
            <Button
              leftSection={<IconMinus size={16} />}
              color="red"
              variant="light"
              disabled={!canRemove}
              onClick={onRemoveTrade}
            >
              Remove
            </Button>
          </Group>
        </Stack>

        <Text size="xs" c="dimmed">
          {selectedTrade
            ? `Selected trade: ${selectedTrade.action} ${selectedTrade.amount} units`
            : selectedTs === null
              ? "Click the chart to select an interval, or click a dot."
              : `Selected interval: ${formatIntervalTs(selectedTs)}`}
        </Text>

        <Badge
          color={stats.isValidEnd ? "green" : "orange"}
          variant="light"
          fullWidth
        >
          {stats.isValidEnd ? "Battery empty" : "Must end month empty"}
        </Badge>
      </Stack>
    </Paper>
  );
}
