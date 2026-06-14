import { useEffect, useRef } from "react";

import { createGame, type GameHandle } from "./createGame";
import { getActiveGlobals, getKeysPressed, clampCameraOrbitPitch } from "./globals";

const ORBIT_SENSITIVITY = 0.005;

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

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const orbit = getActiveGlobals()?.cameraOrbit;
      if (!orbit) return;
      orbit.isDragging = true;
      canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      const orbit = getActiveGlobals()?.cameraOrbit;
      if (!orbit?.isDragging) return;
      orbit.yaw -= event.movementX * ORBIT_SENSITIVITY;
      orbit.pitch = clampCameraOrbitPitch(
        orbit.pitch - event.movementY * ORBIT_SENSITIVITY,
      );
    };

    const onPointerUp = (event: PointerEvent) => {
      const orbit = getActiveGlobals()?.cameraOrbit;
      if (!orbit) return;
      orbit.isDragging = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

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
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      getKeysPressed().clear();
      game?.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} />;
}
