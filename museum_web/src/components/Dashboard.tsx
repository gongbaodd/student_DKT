import {
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

import type { ModelMetadata, SwipeRecord } from "../dkt/types";
import { formatPercent } from "../utils/format";
import { ClusterAffinity } from "./ClusterAffinity";

interface DashboardProps {
  metadata: ModelMetadata;
  predictions: number[] | null;
  swipeHistory: SwipeRecord[];
  swipedCount: number;
  likedCount: number;
  remainingCount: number;
  totalMuseums: number;
  onReset: () => void;
}

export function Dashboard({
  metadata,
  predictions,
  swipeHistory,
  swipedCount,
  likedCount,
  remainingCount,
  totalMuseums,
  onReset,
}: DashboardProps) {
  const likeRate = swipedCount > 0 ? likedCount / swipedCount : 0;
  const recent = swipeHistory.slice(0, 10);

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Paper p="md" radius="md" withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            Total swipes
          </Text>
          <Title order={2}>{swipedCount}</Title>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            Like rate
          </Text>
          <Title order={2}>{formatPercent(likeRate)}</Title>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            Remaining
          </Text>
          <Title order={2}>
            {remainingCount} / {totalMuseums}
          </Title>
        </Paper>
      </SimpleGrid>

      <Paper p="lg" radius="md" withBorder>
        <Text size="sm" c="dimmed" mb="md">
          DKT estimates P(like) for each museum cluster based on your swipe
          sequence. Higher bars mean the model thinks you prefer that theme.
        </Text>
        <ClusterAffinity metadata={metadata} predictions={predictions} />
      </Paper>

      <Paper p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={4}>Recent swipes</Title>
          <Button
            variant="light"
            color="teal"
            leftSection={<IconRefresh size={16} />}
            onClick={onReset}
          >
            Reset session
          </Button>
        </Group>

        {recent.length === 0 ? (
          <Text size="sm" c="dimmed">
            No swipes yet. Swipe on a museum above to start building your profile.
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Museum</Table.Th>
                <Table.Th>Cluster</Table.Th>
                <Table.Th>Your vote</Table.Th>
                <Table.Th>Model predicted</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recent.map((swipe) => (
                <Table.Tr key={`${swipe.museumId}-${swipe.museumName}`}>
                  <Table.Td>{swipe.museumName}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="gray" size="sm">
                      {swipe.clusterName}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={swipe.liked ? "green" : "red"} variant="light">
                      {swipe.liked ? "Like" : "Pass"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{formatPercent(swipe.predictedLike)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}
