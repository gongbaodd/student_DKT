import { Badge, Group, Progress, Stack, Text } from "@mantine/core";

import type { ModelMetadata } from "../dkt/types";
import { affinityLabel, formatPercent } from "../utils/format";

interface ClusterAffinityProps {
  metadata: ModelMetadata;
  predictions: number[] | null;
}

export function ClusterAffinity({ metadata, predictions }: ClusterAffinityProps) {
  if (!predictions) {
    return (
      <Text size="sm" c="dimmed">
        Swipe on museums to see cluster affinity estimates.
      </Text>
    );
  }

  const ranked = metadata.skills
    .map((name, index) => ({
      name,
      score: predictions[index] ?? 0,
      index,
    }))
    .sort((a, b) => b.score - a.score);

  const topThree = ranked.slice(0, 3);

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={600} mb="xs">
          Top cluster picks
        </Text>
        <Group gap="xs">
          {topThree.map((item) => (
            <Badge key={item.index} color="teal" variant="light" size="lg">
              {item.name} · {formatPercent(item.score)}
            </Badge>
          ))}
        </Group>
      </div>

      <Stack gap="sm">
        {ranked.map((item) => (
          <div key={item.index}>
            <Group justify="space-between" mb={4}>
              <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
                {item.name}
              </Text>
              <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                {formatPercent(item.score)} — {affinityLabel(item.score)}
              </Text>
            </Group>
            <Progress
              value={item.score * 100}
              color="teal"
              size="md"
              radius="sm"
              aria-label={`${item.name} affinity`}
            />
          </div>
        ))}
      </Stack>
    </Stack>
  );
}
