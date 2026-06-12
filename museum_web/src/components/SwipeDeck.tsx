import { useCallback, useRef, useState } from "react";

import { ActionIcon, Alert, Box, Group, Stack, Text } from "@mantine/core";
import { IconHeart, IconHeartBroken, IconRefresh } from "@tabler/icons-react";

import type { Museum } from "../dkt/types";
import { MuseumCard } from "./MuseumCard";

const SWIPE_THRESHOLD = 120;

interface SwipeDeckProps {
  currentMuseum: Museum | null;
  nextMuseum: Museum | null;
  predictedLike: number | null;
  hasHistory: boolean;
  onSwipe: (liked: boolean) => Promise<void>;
  onReset: () => void;
}

export function SwipeDeck({
  currentMuseum,
  nextMuseum,
  predictedLike,
  hasHistory,
  onSwipe,
  onReset,
}: SwipeDeckProps) {
  const [dragX, setDragX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);

  const commitSwipe = useCallback(
    async (liked: boolean) => {
      setIsAnimating(true);
      setDragX(liked ? 400 : -400);
      await new Promise((r) => setTimeout(r, 250));
      await onSwipe(liked);
      setDragX(0);
      setIsAnimating(false);
    },
    [onSwipe],
  );

  const handlePointerDown = (event: React.PointerEvent) => {
    if (isAnimating) return;
    dragging.current = true;
    pointerStart.current = { x: event.clientX, y: event.clientY };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!dragging.current || !pointerStart.current || isAnimating) return;
    setDragX(event.clientX - pointerStart.current.x);
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (!dragging.current || isAnimating) return;
    dragging.current = false;
    pointerStart.current = null;

    if (dragX > SWIPE_THRESHOLD) {
      void commitSwipe(true);
    } else if (dragX < -SWIPE_THRESHOLD) {
      void commitSwipe(false);
    } else {
      setDragX(0);
    }

    try {
      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      /* pointer may already be released */
    }
  };

  if (!currentMuseum) {
    return (
      <Stack align="center" gap="md" py="xl">
        <Alert color="teal" title="All museums explored!" radius="md" w="100%" maw={420}>
          You have swiped through every museum. Reset to start a new session.
        </Alert>
        <ActionIcon
          variant="filled"
          color="teal"
          size="xl"
          radius="xl"
          onClick={onReset}
          aria-label="Reset session"
        >
          <IconRefresh size={24} />
        </ActionIcon>
      </Stack>
    );
  }

  return (
    <Stack align="center" gap="md">
      <Box
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          height: 420,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {nextMuseum && (
          <MuseumCard
            museum={nextMuseum}
            predictedLike={null}
            isTop={false}
          />
        )}
        <MuseumCard
          museum={currentMuseum}
          predictedLike={predictedLike}
          dragX={dragX}
          isTop
          interactive
        />
      </Box>

      {!hasHistory && (
        <Text size="sm" c="dimmed" ta="center">
          No swipes yet — predictions use the model baseline until you start.
        </Text>
      )}

      <Group gap="xl">
        <ActionIcon
          variant="filled"
          color="red"
          size={56}
          radius="xl"
          onClick={() => void commitSwipe(false)}
          disabled={isAnimating}
          aria-label="Dislike"
        >
          <IconHeartBroken size={28} />
        </ActionIcon>
        <ActionIcon
          variant="filled"
          color="green"
          size={56}
          radius="xl"
          onClick={() => void commitSwipe(true)}
          disabled={isAnimating}
          aria-label="Like"
        >
          <IconHeart size={28} />
        </ActionIcon>
      </Group>

      <Text size="xs" c="dimmed" ta="center">
        Swipe right to like · Swipe left to pass
      </Text>
    </Stack>
  );
}
