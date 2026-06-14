import { useEffect, useRef } from "react";

import { createGame, type GameHandle } from "./createGame";
import { gameContext } from "./gameContext";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let game: GameHandle | null = null;

    const onKeyDown = (event: KeyboardEvent) => {
      gameContext.keysPressed.add(event.key);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      gameContext.keysPressed.delete(event.key);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    void createGame(canvas).then((handle) => {
      if (cancelled) {
        void handle.dispose();
        return;
      }
      game = handle;
    });

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      gameContext.keysPressed.clear();
      void game?.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} />;
}
