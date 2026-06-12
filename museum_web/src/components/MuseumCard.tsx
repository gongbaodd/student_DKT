import {
  Anchor,
  Badge,
  Box,
  Card,
  Group,
  Image,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";

import type { Museum } from "../dkt/types";
import { affinityLabel, formatPercent } from "../utils/format";

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='240' viewBox='0 0 400 240'%3E%3Crect fill='%23e8dcc8' width='400' height='240'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-family='sans-serif' font-size='18'%3ENo image%3C/text%3E%3C/svg%3E";

interface MuseumCardProps {
  museum: Museum;
  predictedLike: number | null;
  dragX?: number;
  isTop?: boolean;
  interactive?: boolean;
}

export function MuseumCard({
  museum,
  predictedLike,
  dragX = 0,
  isTop = false,
  interactive = false,
}: MuseumCardProps) {
  const rotation = dragX * 0.05;
  const likeOpacity = Math.min(Math.max(dragX / 120, 0), 1);
  const nopeOpacity = Math.min(Math.max(-dragX / 120, 0), 1);

  const transform = interactive
    ? `translateX(${dragX}px) rotate(${rotation}deg)`
    : "scale(0.96) translateY(8px)";

  return (
    <Card
      shadow="md"
      radius="lg"
      padding={0}
      style={{
        position: "absolute",
        inset: 0,
        transform,
        transition: interactive && dragX === 0 ? "transform 0.2s ease" : "none",
        cursor: interactive ? "grab" : "default",
        userSelect: "none",
        touchAction: "none",
        zIndex: isTop ? 2 : 1,
        overflow: "hidden",
      }}
    >
      {isTop && likeOpacity > 0 && (
        <Box
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            zIndex: 3,
            border: "3px solid #2f9e44",
            color: "#2f9e44",
            padding: "4px 12px",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 24,
            transform: "rotate(-12deg)",
            opacity: likeOpacity,
          }}
        >
          LIKE
        </Box>
      )}
      {isTop && nopeOpacity > 0 && (
        <Box
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            zIndex: 3,
            border: "3px solid #e03131",
            color: "#e03131",
            padding: "4px 12px",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 24,
            transform: "rotate(12deg)",
            opacity: nopeOpacity,
          }}
        >
          NOPE
        </Box>
      )}

      <Image
        src={museum.imageUrl || PLACEHOLDER}
        alt={museum.name}
        height={220}
        fallbackSrc={PLACEHOLDER}
        fetchPriority={isTop ? "high" : "auto"}
        style={{ objectFit: "cover" }}
      />

      <Stack gap="xs" p="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Title order={3} lineClamp={2} style={{ flex: 1 }}>
            {museum.name}
          </Title>
          <Badge color="teal" variant="light" style={{ flexShrink: 0 }}>
            {museum.clusterName}
          </Badge>
        </Group>

        <Group gap={6}>
          <IconMapPin size={16} stroke={1.5} />
          <Text size="sm" c="dimmed">
            {museum.city}
            {museum.location ? ` · ${museum.location}` : ""}
          </Text>
        </Group>

        {museum.url && (
          <Anchor href={museum.url} target="_blank" rel="noopener noreferrer" size="sm">
            Visit website
          </Anchor>
        )}

        {isTop && predictedLike !== null && (
          <Text size="sm" c="dimmed" mt="xs">
            Model guess:{" "}
            <Text span fw={600} c="teal.7">
              {formatPercent(predictedLike)}
            </Text>{" "}
            — {affinityLabel(predictedLike)} in{" "}
            <Text span fw={600}>
              {museum.clusterName}
            </Text>
          </Text>
        )}
      </Stack>
    </Card>
  );
}
