import {
  Button,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";

import { PRODUCT_OPTIONS } from "../utils/products";

interface TransactionFormProps {
  onAnalyze: (productCD: string, amount: number) => Promise<void>;
  disabled?: boolean;
}

export function TransactionForm({ onAnalyze, disabled }: TransactionFormProps) {
  const [productCD, setProductCD] = useState<string | null>("W");
  const [amount, setAmount] = useState<number | string>(75);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!productCD || amount === "" || Number(amount) <= 0) return;
    setSubmitting(true);
    try {
      await onAnalyze(productCD, Number(amount));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="md">
        <div>
          <Title order={4}>New transaction</Title>
          <Text size="sm" c="dimmed">
            Choose product and amount to score fraud risk with DKT.
          </Text>
        </div>

        <Select
          label="Product"
          description="IEEE-CIS ProductCD category"
          data={PRODUCT_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          value={productCD}
          onChange={setProductCD}
          allowDeselect={false}
        />

        <NumberInput
          label="Amount (USD)"
          description="Transaction amount in dollars"
          value={amount}
          onChange={setAmount}
          min={0.01}
          decimalScale={2}
          fixedDecimalScale
          prefix="$"
          thousandSeparator=","
        />

        <Button
          onClick={() => void handleSubmit()}
          loading={submitting}
          disabled={disabled || !productCD || amount === ""}
          color="red"
        >
          Analyze fraud risk
        </Button>
      </Stack>
    </Paper>
  );
}
