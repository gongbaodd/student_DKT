import {
  Badge,
  Button,
  Group,
  Paper,
  RingProgress,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import type { FraudAnalysis } from "../dkt/types";
import {
  riskColor,
  riskLabel,
  riskLevel,
} from "../utils/fraudScore";
import { formatAmountRange } from "../utils/skills";
import { formatCurrency, formatPercent } from "../utils/format";
import { productLabel } from "../utils/products";

interface FraudResultProps {
  analysis: FraudAnalysis | null;
  amountEdges: number[];
  onConfirm: (isFraud: boolean) => Promise<void>;
}

export function FraudResult({
  analysis,
  amountEdges,
  onConfirm,
}: FraudResultProps) {
  if (!analysis) {
    return (
      <Paper p="md" radius="md" withBorder>
        <Stack gap="xs">
          <Title order={4}>Fraud score</Title>
          <Text size="sm" c="dimmed">
            Submit a transaction to see the DKT fraud probability.
          </Text>
        </Stack>
      </Paper>
    );
  }

  const level = riskLevel(analysis.fraudProb);
  const color = riskColor(level);

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={4}>Fraud score</Title>
            <Text size="sm" c="dimmed">
              {productLabel(analysis.productCD)} ·{" "}
              {formatCurrency(analysis.amount)}
            </Text>
          </div>
          <Badge color={color} size="lg" variant="filled">
            {riskLabel(level)}
          </Badge>
        </Group>

        <Group justify="center">
          <RingProgress
            size={160}
            thickness={16}
            roundCaps
            sections={[{ value: analysis.fraudProb * 100, color }]}
            label={
              <Stack gap={0} align="center">
                <Text fw={700} size="xl">
                  {formatPercent(analysis.fraudProb)}
                </Text>
                <Text size="xs" c="dimmed">
                  fraud
                </Text>
              </Stack>
            }
          />
        </Group>

        <Stack gap={4}>
          <Text size="sm">
            Skill bucket: <strong>{analysis.skillLabel}</strong>
          </Text>
          <Text size="sm" c="dimmed">
            Amount quartile range:{" "}
            {formatAmountRange(analysis.quartile, amountEdges)}
          </Text>
          <Text size="sm" c="dimmed">
            P(legitimate): {formatPercent(analysis.legitProb)}
          </Text>
          {analysis.isColdStart && (
            <Text size="sm" c="orange">
              Cold start — no cardholder history. Showing population fraud rate
              fallback until you load or build a sequence.
            </Text>
          )}
        </Stack>

        {!analysis.isColdStart && (
          <Group grow>
            <Button
              variant="light"
              color="green"
              onClick={() => void onConfirm(false)}
            >
              Confirm as legit
            </Button>
            <Button
              variant="light"
              color="red"
              onClick={() => void onConfirm(true)}
            >
              Confirm as fraud
            </Button>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
