import {
  Badge,
  Box,
  Drawer,
  Group,
  Pagination,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

import type { Issue } from "../types";
import { IssueDescription } from "./IssueDescription";

const PAGE_SIZES = ["25", "50", "100"] as const;

interface BacklogListProps {
  issues: Issue[];
  selectedKey: string | null;
  onSelect: (issue: Issue) => void;
}

export function BacklogList({ issues, selectedKey, onSelect }: BacklogListProps) {
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
          <Text
            ff="monospace"
            size="sm"
            c="blue.7"
            fw={600}
          >
            {issue.issueKey}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm" lineClamp={2}>
            {issue.title}
          </Text>
        </Table.Td>
        <Table.Td w={80} ta="center">
          <Badge
            variant="light"
            color="gray"
            radius="sm"
            size="md"
            style={{ minWidth: 36 }}
          >
            {issue.storyPoints}
          </Badge>
        </Table.Td>
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
            <Table.Th ta="center">SP</Table.Th>
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

interface IssueDetailPanelProps {
  issue: Issue | null;
  onClose: () => void;
}

export function IssueDetailPanel({ issue, onClose }: IssueDetailPanelProps) {
  if (!issue) {
    return (
      <Box
        p="xl"
        style={{
          border: "1px dashed var(--mantine-color-gray-4)",
          borderRadius: "var(--mantine-radius-sm)",
          background: "var(--mantine-color-gray-0)",
          minHeight: 200,
        }}
      >
        <Text c="dimmed" ta="center" mt="xl">
          Select an issue to view its description
        </Text>
      </Box>
    );
  }

  return (
    <Box
      p="lg"
      style={{
        border: "1px solid var(--mantine-color-gray-3)",
        borderRadius: "var(--mantine-radius-sm)",
        background: "white",
      }}
    >
      <Group justify="space-between" mb="md" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Text ff="monospace" c="blue.7" fw={700} size="sm">
            {issue.issueKey}
          </Text>
          <Badge variant="light" color="gray">
            {issue.storyPoints} SP
          </Badge>
        </Group>
        <UnstyledButton onClick={onClose} aria-label="Close issue detail">
          <Text size="sm" c="dimmed">
            Close
          </Text>
        </UnstyledButton>
      </Group>

      <Text fw={600} size="lg" mb="md">
        {issue.title}
      </Text>

      <Text
        size="xs"
        tt="uppercase"
        fw={700}
        c="dimmed"
        mb="xs"
        style={{ letterSpacing: "0.04em" }}
      >
        Description
      </Text>

      <ScrollArea.Autosize mah="calc(100vh - 320px)" type="auto">
        <IssueDescription content={issue.description} />
      </ScrollArea.Autosize>
    </Box>
  );
}

interface IssueDetailDrawerProps {
  issue: Issue | null;
  opened: boolean;
  onClose: () => void;
}

export function IssueDetailDrawer({ issue, opened, onClose }: IssueDetailDrawerProps) {
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
          <Text
            size="xs"
            tt="uppercase"
            fw={700}
            c="dimmed"
            style={{ letterSpacing: "0.04em" }}
          >
            Description
          </Text>
          <IssueDescription content={issue.description} />
        </Stack>
      ) : null}
    </Drawer>
  );
}
