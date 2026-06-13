import {
  AppShell,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { BacklogList, IssueDetailDrawer, IssueDetailPanel } from "./components/BacklogList";
import { useIssues } from "./hooks/useIssues";
import type { Issue } from "./types";

function filterIssues(issues: Issue[], query: string): Issue[] {
  const q = query.trim().toLowerCase();
  if (!q) return issues;

  return issues.filter(
    (issue) =>
      issue.issueKey.toLowerCase().includes(q) ||
      issue.title.toLowerCase().includes(q),
  );
}

export default function App() {
  const { issues, isLoading, error } = useIssues();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 200);
  const [selected, setSelected] = useState<Issue | null>(null);
  const isMobile = useMediaQuery("(max-width: 62em)");

  const filtered = useMemo(
    () => filterIssues(issues, debouncedSearch),
    [issues, debouncedSearch],
  );

  const totalPoints = useMemo(
    () => filtered.reduce((sum, issue) => sum + issue.storyPoints, 0),
    [filtered],
  );

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header
        style={{
          background: "var(--mantine-color-blue-7)",
          borderBottom: "none",
        }}
      >
        <Container size="xl" h="100%">
          <Group justify="space-between" h="100%" wrap="nowrap">
            <Group gap="sm">
              <Title order={4} c="white">
                Moodle Backlog
              </Title>
              <Text size="sm" c="blue.1">
                Deep-SE · JIRA-style product backlog
              </Text>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main style={{ background: "var(--mantine-color-gray-0)" }}>
        <Container size="xl" py="md">
          {error ? (
            <Text c="red">Failed to load backlog: {error}</Text>
          ) : isLoading ? (
            <Stack align="center" py="xl" gap="md">
              <Loader color="blue" />
              <Text c="dimmed">Loading issues…</Text>
            </Stack>
          ) : (
            <Stack gap="md">
              <Group justify="space-between" align="flex-end">
                <TextInput
                  placeholder="Search by key or summary…"
                  leftSection={<IconSearch size={16} stroke={1.5} />}
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                  style={{ flex: 1, maxWidth: 420 }}
                />
                <Text size="sm" c="dimmed">
                  {filtered.length} issues · {totalPoints} story points
                </Text>
              </Group>

              <Group align="flex-start" gap="md" wrap={isMobile ? "wrap" : "nowrap"}>
                <Stack gap="xs" style={{ flex: 1, minWidth: 0, width: isMobile ? "100%" : undefined }}>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                    Backlog
                  </Text>
                  <BacklogList
                    issues={filtered}
                    selectedKey={selected?.issueKey ?? null}
                    onSelect={setSelected}
                  />
                </Stack>

                {!isMobile && (
                  <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                      Issue detail
                    </Text>
                    <IssueDetailPanel
                      issue={selected}
                      onClose={() => setSelected(null)}
                    />
                  </Stack>
                )}
              </Group>

              {isMobile && (
                <IssueDetailDrawer
                  issue={selected}
                  opened={selected !== null}
                  onClose={() => setSelected(null)}
                />
              )}
            </Stack>
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
