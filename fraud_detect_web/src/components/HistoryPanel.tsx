import {
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";

import type { HistoryEntry } from "../dkt/types";
import { formatCurrency } from "../utils/format";
import { PRODUCT_OPTIONS, productLabel } from "../utils/products";

interface HistoryPanelProps {
  historyLog: HistoryEntry[];
  onAddPast: (
    productCD: string,
    amount: number,
    isFraud: boolean,
  ) => Promise<void>;
  onReset: () => void;
}

export function HistoryPanel({
  historyLog,
  onAddPast,
  onReset,
}: HistoryPanelProps) {
  const [productCD, setProductCD] = useState<string | null>("C");
  const [amount, setAmount] = useState<number | string>(50);
  const [outcome, setOutcome] = useState<string | null>("legit");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    if (!productCD || !outcome || amount === "" || Number(amount) <= 0) return;
    setSubmitting(true);
    try {
      await onAddPast(productCD, Number(amount), outcome === "fraud");
      setAmount(50);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={4}>Cardholder history</Title>
            <Text size="sm" c="dimmed">
              {historyLog.length} past transaction
              {historyLog.length === 1 ? "" : "s"} in sequence.
            </Text>
          </div>
          <Button variant="subtle" color="gray" size="xs" onClick={onReset}>
            Reset
          </Button>
        </Group>

        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Add past transaction
          </Text>
          <Group align="flex-end" grow preventGrowOverflow={false}>
            <Select
              label="Product"
              data={PRODUCT_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={productCD}
              onChange={setProductCD}
              allowDeselect={false}
            />
            <NumberInput
              label="Amount"
              value={amount}
              onChange={setAmount}
              min={0.01}
              decimalScale={2}
              prefix="$"
            />
            <Select
              label="Outcome"
              data={[
                { value: "legit", label: "Legitimate" },
                { value: "fraud", label: "Fraudulent" },
              ]}
              value={outcome}
              onChange={setOutcome}
              allowDeselect={false}
            />
          </Group>
          <Button
            variant="light"
            onClick={() => void handleAdd()}
            loading={submitting}
          >
            Add to history
          </Button>
        </Stack>

        {historyLog.length === 0 ? (
          <Text size="sm" c="dimmed">
            No history yet. Load a demo profile or add past transactions.
          </Text>
        ) : (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Product</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Skill</Table.Th>
                <Table.Th>Outcome</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {[...historyLog].reverse().slice(0, 8).map((entry) => (
                <Table.Tr key={entry.id}>
                  <Table.Td>{productLabel(entry.productCD)}</Table.Td>
                  <Table.Td>{formatCurrency(entry.amount)}</Table.Td>
                  <Table.Td>{entry.skillLabel}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={entry.isFraud ? "red" : "green"}
                      variant="light"
                    >
                      {entry.isFraud ? "Fraud" : "Legit"}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Paper>
  );
}
