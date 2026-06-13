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

import {
  BacklogList,
  DoneDetailDrawer,
  TodoDetailDrawer,
} from "./components/BacklogList";
import { useClusterNames } from "./hooks/useClusterNames";
import { useDoneIssues, useTodoIssues } from "./hooks/useIssues";
import { useIrtModel } from "./hooks/useIrtModel";
import type { DoneHistoryEntry } from "./irt/types";
import { clusterNameFor, type DoneIssue, type TodoIssue } from "./types";

function filterDone(
  issues: DoneIssue[],
  query: string,
  clusterNames: ReturnType<typeof useClusterNames>["clusterNames"],
): DoneIssue[] {
  const q = query.trim().toLowerCase();
  if (!q) return issues;
  return issues.filter(
    (issue) =>
      issue.issueKey.toLowerCase().includes(q) ||
      issue.title.toLowerCase().includes(q) ||
      clusterNameFor(issue.component, clusterNames).toLowerCase().includes(q),
  );
}

function filterTodos(
  issues: TodoIssue[],
  query: string,
  clusterNames: ReturnType<typeof useClusterNames>["clusterNames"],
): TodoIssue[] {
  const q = query.trim().toLowerCase();
  if (!q) return issues;
  return issues.filter(
    (issue) =>
      issue.issueKey.toLowerCase().includes(q) ||
      issue.title.toLowerCase().includes(q) ||
      clusterNameFor(issue.component, clusterNames).toLowerCase().includes(q),
  );
}

export default function App() {
  const { data: doneIssues, isLoading: doneLoading, error: doneError } = useDoneIssues();
  const { data: todoIssues, isLoading: todosLoading, error: todosError } = useTodoIssues();
  const {
    clusterNames,
    isLoading: clusterNamesLoading,
    error: clusterNamesError,
  } = useClusterNames();
  const { model, isLoading: modelLoading, error: modelError } = useIrtModel();

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 200);
  const [selectedDone, setSelectedDone] = useState<DoneIssue | null>(null);
  const [selectedTodo, setSelectedTodo] = useState<TodoIssue | null>(null);
  const isMobile = useMediaQuery("(max-width: 62em)");

  const filteredDone = useMemo(
    () => filterDone(doneIssues, debouncedSearch, clusterNames),
    [doneIssues, debouncedSearch, clusterNames],
  );

  const filteredTodos = useMemo(
    () => filterTodos(todoIssues, debouncedSearch, clusterNames),
    [todoIssues, debouncedSearch, clusterNames],
  );

  const doneTotalPoints = useMemo(
    () => filteredDone.reduce((sum, issue) => sum + issue.storyPoints, 0),
    [filteredDone],
  );

  const doneHistory: DoneHistoryEntry[] = useMemo(
    () =>
      doneIssues.map((issue) => ({
        issueKey: issue.issueKey,
        storyPoints: issue.storyPoints,
        component: issue.component,
      })),
    [doneIssues],
  );

  const isLoading = doneLoading || todosLoading || clusterNamesLoading;
  const loadError = doneError ?? todosError ?? clusterNamesError;

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
                Deep-SE · IRT Story Points
              </Text>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main style={{ background: "var(--mantine-color-gray-0)" }}>
        <Container size="xl" py="md">
          {loadError ? (
            <Text c="red">Failed to load backlog: {loadError}</Text>
          ) : modelError ? (
            <Text c="red">Failed to load IRT model: {modelError}</Text>
          ) : isLoading ? (
            <Stack align="center" py="xl" gap="md">
              <Loader color="blue" />
              <Text c="dimmed">Loading issues…</Text>
            </Stack>
          ) : (
            <Stack gap="md">
              <Group justify="space-between" align="flex-end">
                <TextInput
                  placeholder="Search by key, summary, or cluster…"
                  leftSection={<IconSearch size={16} stroke={1.5} />}
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                  style={{ flex: 1, maxWidth: 420 }}
                />
                <Text size="sm" c="dimmed">
                  {filteredDone.length} done · {doneTotalPoints} SP ·{" "}
                  {filteredTodos.length} todos
                </Text>
              </Group>

              <Group align="flex-start" gap="md" wrap={isMobile ? "wrap" : "nowrap"}>
                <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                    Done (B)
                  </Text>
                  <BacklogList
                    issues={filteredDone}
                    selectedKey={selectedDone?.issueKey ?? null}
                    onSelect={setSelectedDone}
                    showStoryPoints
                    clusterNames={clusterNames}
                    getStoryPoints={(issue) => issue.storyPoints}
                  />
                </Stack>

                <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                    Todos (A)
                  </Text>
                  <BacklogList
                    issues={filteredTodos}
                    selectedKey={selectedTodo?.issueKey ?? null}
                    onSelect={setSelectedTodo}
                    showStoryPoints={false}
                    clusterNames={clusterNames}
                  />
                </Stack>
              </Group>

              <DoneDetailDrawer
                issue={selectedDone}
                opened={selectedDone !== null}
                clusterNames={clusterNames}
                onClose={() => setSelectedDone(null)}
              />
              <TodoDetailDrawer
                issue={selectedTodo}
                opened={selectedTodo !== null}
                model={model}
                modelLoading={modelLoading}
                doneHistory={doneHistory}
                clusterNames={clusterNames}
                onClose={() => setSelectedTodo(null)}
              />
            </Stack>
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
