import {
  Badge,
  Box,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  Table,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";

import type { Issue } from "../types";

interface BacklogListProps {
  issues: Issue[];
  selectedKey: string | null;
  onSelect: (issue: Issue) => void;
}

export function BacklogList({ issues, selectedKey, onSelect }: BacklogListProps) {
  const rows = issues.map((issue) => {
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
      </Table>

      <ScrollArea.Autosize mah="calc(100vh - 180px)" type="auto">
        <Table verticalSpacing="sm" horizontalSpacing="md">
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </ScrollArea.Autosize>
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
        <Text
          size="sm"
          style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
        >
          {issue.description}
        </Text>
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
          <Text size="sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {issue.description}
          </Text>
        </Stack>
      ) : null}
    </Drawer>
  );
}
