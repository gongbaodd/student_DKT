import { Paper, Stack, Text, Title } from "@mantine/core";
import { IconBattery4 } from "@tabler/icons-react";

export function BatteryIconPanel() {
  return (
    <Paper p="xl" radius="md" withBorder h="100%">
      <Stack align="center" justify="center" gap="lg" h="100%" mih={360}>
        <Title order={4}>Battery usage</Title>
        <IconBattery4 size={160} stroke={1.5} color="var(--mantine-color-blue-6)" />
        <Text size="sm" c="dimmed" ta="center">
          Decorative battery indicator — not connected to chart data.
        </Text>
      </Stack>
    </Paper>
  );
}
