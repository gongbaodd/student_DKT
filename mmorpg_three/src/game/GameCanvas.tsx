import { useEffect, useRef } from "react";

import { createGame, type GameHandle } from "./createGame";
import {
  closeNpcMenu,
  getNpcMenuState,
  openNpcMenu,
  resetNpcInteractionStore,
} from "./interaction/npcInteractionStore";
import { pickNpcBoatAtScreen } from "./interaction/pickNpcBoat";
import { getActiveGlobals, getKeysPressed, clampCameraOrbitPitch } from "./globals";

const ORBIT_SENSITIVITY = 0.005;
const ORBIT_BUTTON = 2;

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let game: GameHandle | null = null;

    const tryPickNpc = (clientX: number, clientY: number): boolean => {
      const globals = getActiveGlobals();
      if (!globals?.initialized) return false;

      const pick = pickNpcBoatAtScreen(
        globals.camera,
        canvas,
        globals.npcPickTargets,
        clientX,
        clientY,
      );

      if (pick) {
        openNpcMenu(pick.entityIndex, clientX, clientY);
        return true;
      }

      if (getNpcMenuState()) {
        closeNpcMenu();
      }
      return false;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      getKeysPressed().add(event.key);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      getKeysPressed().delete(event.key);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button === 0) {
        tryPickNpc(event.clientX, event.clientY);
        return;
      }

      if (event.button !== ORBIT_BUTTON) return;

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
      if (event.button !== ORBIT_BUTTON) return;

      const orbit = getActiveGlobals()?.cameraOrbit;
      if (!orbit) return;

      orbit.isDragging = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("contextmenu", onContextMenu);

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
      canvas.removeEventListener("contextmenu", onContextMenu);
      getKeysPressed().clear();
      resetNpcInteractionStore();
      game?.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="game-canvas" />;
}
