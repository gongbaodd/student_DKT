import { Badge, Group, Progress, Stack, Text } from "@mantine/core";

import type { ModelMetadata } from "../dkt/types";
import { formatPercent, legitLabel } from "../utils/format";

interface SkillRiskChartProps {
  metadata: ModelMetadata;
  predictions: number[] | null;
  highlightSkillId?: number | null;
}

export function SkillRiskChart({
  metadata,
  predictions,
  highlightSkillId,
}: SkillRiskChartProps) {
  if (!predictions) {
    return (
      <Text size="sm" c="dimmed">
        Build cardholder history to see per-skill legitimacy estimates.
      </Text>
    );
  }

  const ranked = metadata.skills
    .map((name, index) => ({
      name,
      legitProb: predictions[index] ?? 0,
      fraudProb: 1 - (predictions[index] ?? 0),
      index,
    }))
    .sort((a, b) => b.fraudProb - a.fraudProb);

  const topThree = ranked.slice(0, 3);

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={600} mb="xs">
          Highest fraud-risk skills
        </Text>
        <Group gap="xs">
          {topThree.map((item) => (
            <Badge key={item.index} color="red" variant="light" size="lg">
              {item.name} · {formatPercent(item.fraudProb)} fraud
            </Badge>
          ))}
        </Group>
      </div>

      <Stack gap="sm">
        {ranked.map((item) => {
          const isHighlighted = item.index === highlightSkillId;
          return (
            <div key={item.index}>
              <Group justify="space-between" mb={4}>
                <Text
                  size="sm"
                  fw={isHighlighted ? 700 : 400}
                  lineClamp={1}
                  style={{ flex: 1 }}
                >
                  {item.name}
                  {isHighlighted ? " (current)" : ""}
                </Text>
                <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                  {formatPercent(item.legitProb)} legit —{" "}
                  {legitLabel(item.legitProb)}
                </Text>
              </Group>
              <Progress
                value={item.legitProb * 100}
                color={isHighlighted ? "red" : "gray"}
                size="md"
                radius="sm"
                aria-label={`${item.name} legitimacy`}
              />
            </div>
          );
        })}
      </Stack>
    </Stack>
  );
}
