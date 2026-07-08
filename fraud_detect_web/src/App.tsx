import {
  AppShell,
  Container,
  Grid,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { FraudResult } from "./components/FraudResult";
import { HistoryPanel } from "./components/HistoryPanel";
import { SkillRiskChart } from "./components/SkillRiskChart";
import { TransactionForm } from "./components/TransactionForm";
import { useFraudSession } from "./hooks/useFraudSession";

function AppHeader() {
  return (
    <AppShell.Header
      style={{
        background: "var(--mantine-color-slate-0)",
        borderBottom: "1px solid var(--mantine-color-slate-3)",
      }}
    >
      <Container size="xl" h="100%">
        <Stack justify="center" h="100%" gap={0}>
          <Title order={3}>Fraud Detect</Title>
          <Text size="xs" c="dimmed">
            Deep Knowledge Tracing · IEEE-CIS cardholder sequences
          </Text>
        </Stack>
      </Container>
    </AppShell.Header>
  );
}

export default function App() {
  const session = useFraudSession();

  if (session.isLoading) {
    return (
      <AppShell header={{ height: 64 }} padding="md">
        <AppHeader />
        <AppShell.Main style={{ background: "var(--mantine-color-slate-1)" }}>
          <Container size="xl" py="xl">
            <Stack align="center" gap="md">
              <Loader color="red" />
              <Text c="dimmed">Loading FraudDKT model…</Text>
            </Stack>
          </Container>
        </AppShell.Main>
      </AppShell>
    );
  }

  if (!("model" in session)) {
    return (
      <AppShell header={{ height: 64 }} padding="md">
        <AppHeader />
        <AppShell.Main style={{ background: "var(--mantine-color-slate-1)" }}>
          <Container size="xl" py="xl">
            <Text c="red">Failed to load: {session.loadError}</Text>
          </Container>
        </AppShell.Main>
      </AppShell>
    );
  }

  const {
    model,
    amountEdges,
    demoProfiles,
    historyLog,
    predictions,
    analysis,
    selectedProfileId,
    loadDemoProfile,
    addPastTransaction,
    analyzeTransaction,
    confirmTransaction,
    reset,
  } = session;

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppHeader />

      <AppShell.Main style={{ background: "var(--mantine-color-slate-1)" }}>
        <Container size="xl" py="md">
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Paper p="md" radius="md" withBorder>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  History length
                </Text>
                <Title order={2}>{historyLog.length}</Title>
              </Paper>
              <Paper p="md" radius="md" withBorder>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Skills tracked
                </Text>
                <Title order={2}>{model.metadata.numSkills}</Title>
              </Paper>
              <Paper p="md" radius="md" withBorder>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Model hidden dim
                </Text>
                <Title order={2}>{model.metadata.hiddenDim}</Title>
              </Paper>
            </SimpleGrid>

            <Grid gutter="lg">
              <Grid.Col span={{ base: 12, md: 5 }}>
                <Stack gap="lg">
                  <Paper p="md" radius="md" withBorder>
                    <Stack gap="md">
                      <div>
                        <Title order={4}>Demo cardholder</Title>
                        <Text size="sm" c="dimmed">
                          Load a real training-sequence profile to seed the LSTM
                          state.
                        </Text>
                      </div>
                      <Select
                        label="Profile"
                        placeholder="Choose a demo cardholder"
                        data={demoProfiles.map((profile) => ({
                          value: profile.id,
                          label: profile.label,
                          description: profile.description,
                        }))}
                        value={selectedProfileId}
                        onChange={(value) => {
                          if (value) void loadDemoProfile(value);
                        }}
                        searchable
                        nothingFoundMessage="No profiles"
                      />
                    </Stack>
                  </Paper>

                  <TransactionForm onAnalyze={analyzeTransaction} />
                  <HistoryPanel
                    historyLog={historyLog}
                    onAddPast={addPastTransaction}
                    onReset={reset}
                  />
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 7 }}>
                <Stack gap="lg">
                  <FraudResult
                    analysis={analysis ?? null}
                    amountEdges={amountEdges}
                    onConfirm={confirmTransaction}
                  />
                  <Paper p="md" radius="md" withBorder>
                    <Stack gap="md">
                      <Title order={4}>Skill risk profile</Title>
                      <SkillRiskChart
                        metadata={model.metadata}
                        predictions={predictions}
                        highlightSkillId={analysis?.skillId ?? null}
                      />
                    </Stack>
                  </Paper>
                </Stack>
              </Grid.Col>
            </Grid>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
