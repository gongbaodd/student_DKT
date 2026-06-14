import {
  AppShell,
  Container,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { BatteryIconPanel } from "./components/BatteryIconPanel";
import { TemperatureChart } from "./components/TemperatureChart";
import { useElectricityMonth } from "./hooks/useElectricityMonth";

function AppHeader() {
  return (
    <AppShell.Header
      style={{
        background: "var(--mantine-color-gray-0)",
        borderBottom: "1px solid var(--mantine-color-gray-3)",
      }}
    >
      <Container size="xl" h="100%">
        <Stack justify="center" h="100%" gap={0}>
          <Title order={3}>Battery Agent Measurement Demo</Title>
          <Text size="xs" c="dimmed">
            UCI electricity load · Lisbon temperature
          </Text>
        </Stack>
      </Container>
    </AppShell.Header>
  );
}

export default function App() {
  const { data, chartRows, calendarBands, isLoading, error } =
    useElectricityMonth();

  if (error) {
    return (
      <AppShell header={{ height: 64 }} padding="md">
        <AppHeader />
        <AppShell.Main style={{ background: "var(--mantine-color-gray-0)" }}>
          <Container size="xl" py="xl">
            <Text c="red">Failed to load: {error}</Text>
          </Container>
        </AppShell.Main>
      </AppShell>
    );
  }

  if (isLoading || !data) {
    return (
      <AppShell header={{ height: 64 }} padding="md">
        <AppHeader />
        <AppShell.Main style={{ background: "var(--mantine-color-gray-0)" }}>
          <Container size="xl" py="xl">
            <Stack align="center" gap="md">
              <Loader color="blue" />
              <Text c="dimmed">Loading June 2014 data…</Text>
            </Stack>
          </Container>
        </AppShell.Main>
      </AppShell>
    );
  }

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppHeader />
      <AppShell.Main style={{ background: "var(--mantine-color-gray-0)" }}>
        <Container size="xl">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <BatteryIconPanel />
            <TemperatureChart
              chartRows={chartRows}
              calendarBands={calendarBands}
              holidays={data.holidays}
            />
          </SimpleGrid>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
