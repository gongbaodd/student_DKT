import {
  AppShell,
  Container,
  Divider,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { Dashboard } from "./components/Dashboard";
import { SwipeDeck } from "./components/SwipeDeck";
import { useDktSession } from "./hooks/useDktSession";

function AppHeader() {
  return (
    <AppShell.Header
      style={{
        background: "var(--mantine-color-cream-0)",
        borderBottom: "1px solid var(--mantine-color-cream-3)",
      }}
    >
      <Container size="md" h="100%">
        <Stack justify="center" h="100%" gap={0}>
          <Title order={3}>Museum Match</Title>
          <Text size="xs" c="dimmed">
            Deep Knowledge Tracing · Estonian museums
          </Text>
        </Stack>
      </Container>
    </AppShell.Header>
  );
}

export default function App() {
  const session = useDktSession();

  if (session.loadError) {
    return (
      <AppShell header={{ height: 64 }} padding="md">
        <AppHeader />
        <AppShell.Main style={{ background: "var(--mantine-color-cream-1)" }}>
          <Container size="md" py="xl">
            <Text c="red">Failed to load: {session.loadError}</Text>
          </Container>
        </AppShell.Main>
      </AppShell>
    );
  }

  if (session.isLoading || !session.model) {
    return (
      <AppShell header={{ height: 64 }} padding="md">
        <AppHeader />
        <AppShell.Main style={{ background: "var(--mantine-color-cream-1)" }}>
          <Container size="md" py="xl">
            <Stack align="center" gap="md">
              <Loader color="teal" />
              <Text c="dimmed">Loading model and museums…</Text>
            </Stack>
          </Container>
        </AppShell.Main>
      </AppShell>
    );
  }

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppHeader />

      <AppShell.Main style={{ background: "var(--mantine-color-cream-1)" }}>
        <Container size="md" py="md">
          <Stack gap="lg">
            <SwipeDeck
              currentMuseum={session.currentMuseum}
              nextMuseum={session.nextMuseum}
              predictedLike={session.currentPrediction}
              hasHistory={session.encodedHistory.length > 0}
              onSwipe={session.swipe}
              onReset={session.reset}
            />

            <Divider
              label="How the model sees you"
              labelPosition="center"
              color="cream.4"
            />

            <Dashboard
              metadata={session.model.metadata}
              predictions={session.predictions}
              swipeHistory={session.swipeHistory}
              swipedCount={session.swipedCount}
              likedCount={session.likedCount}
              remainingCount={session.remainingCount}
              totalMuseums={session.museums.length}
              onReset={session.reset}
            />
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
