import {
  Badge,
  Button,
  Group,
  Loader,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from "@mantine/core";

import type { DktSolutionReport } from "../utils/dktReport";
import { formatPrice } from "../utils/batteryTrading";
import { formatIntervalTs } from "../utils/dateTime";
import { capabilityLabel, formatPercent } from "../utils/format";

interface DktSolutionReportProps {
  report: DktSolutionReport | null;
  modelLoading: boolean;
  reportLoading: boolean;
  loadError: string | null;
  canGenerate: boolean;
  onGenerateReport: () => void;
}

function actionColor(action: string): string {
  if (action === "buy") return "green";
  if (action === "sell") return "red";
  return "gray";
}

export function DktSolutionReportPanel({
  report,
  modelLoading,
  reportLoading,
  loadError,
  canGenerate,
  onGenerateReport,
}: DktSolutionReportProps) {
  const generateLabel = report ? "Regenerate report" : "Generate report";

  if (reportLoading) {
    return (
      <Stack align="center" gap="sm" py="xl">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Building DKT capability report…
        </Text>
      </Stack>
    );
  }

  if (!report) {
    return (
      <Stack gap="md" align="center" py="xl">
        <Stack gap={4} align="center">
          <Text size="sm" c="dimmed" ta="center">
            Price-aware buy / hold / sell capability after replaying this
            solution through the DKT model.
          </Text>
          {modelLoading ? (
            <Group gap="xs">
              <Loader size="xs" />
              <Text size="xs" c="dimmed">
                Loading DKT model…
              </Text>
            </Group>
          ) : null}
          {loadError ? (
            <Text size="sm" c="red" ta="center">
              {loadError}
            </Text>
          ) : null}
        </Stack>
        <Button
          variant="light"
          disabled={!canGenerate}
          onClick={onGenerateReport}
        >
          {generateLabel}
        </Button>
      </Stack>
    );
  }

  const summaryItems = report.skillNames.map((name, index) => ({
    name,
    score: report.summary[index] ?? 0,
  }));

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Stack gap={4}>
          <Text size="sm" c="dimmed">
            Price-aware buy / hold / sell capability after replaying this
            solution through the DKT model.
          </Text>
          <Text size="xs" c="dimmed">
            Evaluated at {report.sampleCount} price-stratified intervals (4 per
            day). Random solution uses 80 temperature-based samples instead.
          </Text>
        </Stack>
        <Button variant="light" size="xs" onClick={onGenerateReport}>
          {generateLabel}
        </Button>
      </Group>

      {loadError ? (
        <Text size="sm" c="red">
          {loadError}
        </Text>
      ) : null}

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            Oracle match rate
          </Text>
          <Text size="lg" fw={600}>
            {formatPercent(report.matchRate)}
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            Sample points
          </Text>
          <Text size="lg" fw={600}>
            {report.sampleCount}
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            Skills tracked
          </Text>
          <Text size="lg" fw={600}>
            Buy · Hold · Sell
          </Text>
        </Stack>
      </SimpleGrid>

      <Stack gap="sm">
        <Text size="sm" fw={600}>
          Predicted capability
        </Text>
        {summaryItems.map((item) => (
          <div key={item.name}>
            <Group justify="space-between" mb={4}>
              <Text size="sm">{item.name}</Text>
              <Text size="sm" c="dimmed">
                {formatPercent(item.score)} — {capabilityLabel(item.score)}
              </Text>
            </Group>
            <Progress
              value={item.score * 100}
              color="blue"
              size="md"
              radius="sm"
              aria-label={`${item.name} capability`}
            />
          </div>
        ))}
      </Stack>

      <Stack gap="sm">
        <Text size="sm" fw={600}>
          Per-skill accuracy vs price oracle
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          {report.perSkillStats.map((entry) => (
            <Stack key={entry.skillName} gap={2}>
              <Text size="sm" fw={500}>
                {entry.skillName}
              </Text>
              <Text size="xs" c="dimmed">
                {entry.correct}/{entry.total} matched oracle
              </Text>
              <Text size="xs" c="dimmed">
                Avg predicted: {formatPercent(entry.predicted)}
              </Text>
            </Stack>
          ))}
        </SimpleGrid>
      </Stack>

      <Stack gap="xs">
        <Text size="sm" fw={600}>
          Sample point breakdown
        </Text>
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
                <Table.Th>Time</Table.Th>
                <Table.Th ta="right">Price</Table.Th>
                <Table.Th>Quartile</Table.Th>
                <Table.Th>Actual</Table.Th>
                <Table.Th>Oracle</Table.Th>
                <Table.Th>Match</Table.Th>
                <Table.Th ta="right">P(buy)</Table.Th>
                <Table.Th ta="right">P(hold)</Table.Th>
                <Table.Th ta="right">P(sell)</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {report.points.map((point) => (
                <Table.Tr key={point.ts}>
                  <Table.Td>{formatIntervalTs(point.ts)}</Table.Td>
                  <Table.Td ta="right">{formatPrice(point.price)}</Table.Td>
                  <Table.Td>{point.priceQuartile}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={actionColor(point.actualAction)}
                      variant="light"
                      size="sm"
                    >
                      {point.actualAction}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={actionColor(point.oracleAction)}
                      variant="outline"
                      size="sm"
                    >
                      {point.oracleAction}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={point.matched ? "green" : "orange"}
                      variant="light"
                      size="sm"
                    >
                      {point.matched ? "yes" : "no"}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta="right" c="dimmed">
                    {formatPercent(point.predictedBuy)}
                  </Table.Td>
                  <Table.Td ta="right" c="dimmed">
                    {formatPercent(point.predictedHold)}
                  </Table.Td>
                  <Table.Td ta="right" c="dimmed">
                    {formatPercent(point.predictedSell)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
      </Stack>
    </Stack>
  );
}
