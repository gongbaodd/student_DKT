import { useEffect, useRef } from "react";

import { createGame, type GameHandle } from "./createGame";
import { getKeysPressed } from "./globals";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let game: GameHandle | null = null;

    const onKeyDown = (event: KeyboardEvent) => {
      getKeysPressed().add(event.key);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      getKeysPressed().delete(event.key);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    void createGame(canvas).then((handle) => {
      if (cancelled) {
        handle.dispose();
        return;
      }
      game = handle;
    });

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      getKeysPressed().clear();
      game?.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} />;
}
