import {
  Badge,
  Box,
  Button,
  Drawer,
  Group,
  Loader,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

import type { IrtModel } from "../irt/model";
import type { DoneHistoryEntry } from "../irt/types";
import type { DoneIssue, TodoIssue } from "../types";
import { IssueDescription } from "./IssueDescription";

const PAGE_SIZES = ["25", "50", "100"] as const;

interface BacklogListProps<T extends { issueKey: string; title: string }> {
  issues: T[];
  selectedKey: string | null;
  onSelect: (issue: T) => void;
  showStoryPoints: boolean;
  getStoryPoints?: (issue: T) => number;
}

export function BacklogList<T extends { issueKey: string; title: string }>({
  issues,
  selectedKey,
  onSelect,
  showStoryPoints,
  getStoryPoints,
}: BacklogListProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  useEffect(() => {
    setPage(1);
  }, [issues]);

  const totalPages = Math.max(1, Math.ceil(issues.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageIssues = useMemo(() => {
    const start = (page - 1) * pageSize;
    return issues.slice(start, start + pageSize);
  }, [issues, page, pageSize]);

  const rangeStart = issues.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, issues.length);

  const rows = pageIssues.map((issue) => {
    const isSelected = issue.issueKey === selectedKey;

    return (
      <Table.Tr
        key={issue.issueKey}
        onClick={() => onSelect(issue)}
        style={{
          cursor: "pointer",
          background: isSelected ? "var(--mantine-color-blue-0)" : undefined,
        }}
      >
        <Table.Td w={120}>
          <Text ff="monospace" size="sm" c="blue.7" fw={600}>
            {issue.issueKey}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm" lineClamp={2}>
            {issue.title}
          </Text>
        </Table.Td>
        {showStoryPoints && getStoryPoints ? (
          <Table.Td w={80} ta="center">
            <Badge
              variant="light"
              color="gray"
              radius="sm"
              size="md"
              style={{ minWidth: 36 }}
            >
              {getStoryPoints(issue)}
            </Badge>
          </Table.Td>
        ) : null}
        <Table.Td w={32}>
          <IconChevronRight
            size={16}
            stroke={1.5}
            color="var(--mantine-color-gray-5)"
          />
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Box
      style={{
        border: "1px solid var(--mantine-color-gray-3)",
        borderRadius: "var(--mantine-radius-sm)",
        overflow: "hidden",
        background: "white",
      }}
    >
      <Table
        highlightOnHover
        verticalSpacing="sm"
        horizontalSpacing="md"
        stickyHeader
      >
        <Table.Thead
          style={{
            background: "var(--mantine-color-gray-0)",
            borderBottom: "1px solid var(--mantine-color-gray-3)",
          }}
        >
          <Table.Tr>
            <Table.Th>Key</Table.Th>
            <Table.Th>Summary</Table.Th>
            {showStoryPoints ? <Table.Th ta="center">SP</Table.Th> : null}
            <Table.Th w={32} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>

      <Group
        justify="space-between"
        p="sm"
        wrap="wrap"
        gap="sm"
        style={{
          borderTop: "1px solid var(--mantine-color-gray-3)",
          background: "var(--mantine-color-gray-0)",
        }}
      >
        <Text size="sm" c="dimmed">
          {issues.length === 0
            ? "No issues"
            : `${rangeStart}–${rangeEnd} of ${issues.length}`}
        </Text>

        <Group gap="sm" wrap="wrap">
          <Select
            size="xs"
            w={72}
            data={[...PAGE_SIZES]}
            value={String(pageSize)}
            onChange={(value) => {
              if (value) {
                setPageSize(Number(value));
                setPage(1);
              }
            }}
            aria-label="Issues per page"
          />
          <Pagination
            size="sm"
            total={totalPages}
            value={page}
            onChange={setPage}
            withEdges
          />
        </Group>
      </Group>
    </Box>
  );
}

interface TodoDetailDrawerProps {
  issue: TodoIssue | null;
  opened: boolean;
  model: IrtModel | null;
  modelLoading: boolean;
  doneHistory: DoneHistoryEntry[];
  onClose: () => void;
}

export function TodoDetailDrawer({
  issue,
  opened,
  model,
  modelLoading,
  doneHistory,
  onClose,
}: TodoDetailDrawerProps) {
  const [predicted, setPredicted] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  useEffect(() => {
    setPredicted(null);
    setEstimateError(null);
  }, [issue?.issueKey]);

  async function handleEstimate() {
    if (!issue || !model) return;

    setEstimating(true);
    setEstimateError(null);
    try {
      const points = await model.predictStoryPoints(doneHistory, issue.issueKey);
      setPredicted(points);
    } catch (err: unknown) {
      setEstimateError(
        err instanceof Error ? err.message : "Failed to estimate story points",
      );
    } finally {
      setEstimating(false);
    }
  }

  return (
    <Drawer
      opened={opened && issue !== null}
      onClose={onClose}
      title={
        issue ? (
          <Group gap="sm">
            <Text ff="monospace" c="blue.7" fw={700} size="sm">
              {issue.issueKey}
            </Text>
            {predicted !== null ? (
              <Badge variant="light" color="blue">
                {predicted} SP
              </Badge>
            ) : null}
            <Badge variant="outline" color="gray">
              Original: {issue.originalStoryPoints} SP
            </Badge>
          </Group>
        ) : null
      }
      position="right"
      size="lg"
      padding="lg"
    >
      {issue ? (
        <Stack gap="md">
          <Text fw={600} size="lg">
            {issue.title}
          </Text>
          <Group>
            <Button
              onClick={handleEstimate}
              loading={estimating}
              disabled={modelLoading || !model}
              w="fit-content"
            >
              Estimate story points
            </Button>
            {modelLoading ? (
              <Group gap="xs">
                <Loader size="xs" />
                <Text size="sm" c="dimmed">
                  Loading model…
                </Text>
              </Group>
            ) : null}
          </Group>
          {estimateError ? (
            <Text size="sm" c="red">
              {estimateError}
            </Text>
          ) : null}
          {predicted !== null ? (
            <Text size="sm" c="dimmed">
              Predicted {predicted} SP vs original {issue.originalStoryPoints} SP
              {predicted === issue.originalStoryPoints ? " — match" : ""}
            </Text>
          ) : null}
          <IssueDescription content={issue.description} />
        </Stack>
      ) : null}
    </Drawer>
  );
}

interface DoneDetailDrawerProps {
  issue: DoneIssue | null;
  opened: boolean;
  onClose: () => void;
}

export function DoneDetailDrawer({ issue, opened, onClose }: DoneDetailDrawerProps) {
  return (
    <Drawer
      opened={opened && issue !== null}
      onClose={onClose}
      title={
        issue ? (
          <Group gap="sm">
            <Text ff="monospace" c="blue.7" fw={700} size="sm">
              {issue.issueKey}
            </Text>
            <Badge variant="light" color="gray">
              {issue.storyPoints} SP
            </Badge>
          </Group>
        ) : null
      }
      position="right"
      size="lg"
      padding="lg"
    >
      {issue ? (
        <Stack gap="md">
          <Text fw={600} size="lg">
            {issue.title}
          </Text>
          <IssueDescription content={issue.description} />
        </Stack>
      ) : null}
    </Drawer>
  );
}
