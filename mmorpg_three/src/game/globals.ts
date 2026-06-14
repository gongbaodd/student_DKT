import type { PerspectiveCamera, Scene, ShaderMaterial, WebGLRenderer } from "three";
import type { Object3D } from "three";
import type { World } from "elics";

import type { JoltWorld } from "./physics/joltWorld";

export interface CameraOrbit {
  yaw: number;
  pitch: number;
  distance: number;
  isDragging: boolean;
}

/** Minimum elevation above the horizon (radians). */
export const CAMERA_ORBIT_MIN_PITCH = (12 * Math.PI) / 180;
/** Maximum elevation above the horizon (radians). */
export const CAMERA_ORBIT_MAX_PITCH = (55 * Math.PI) / 180;

export function clampCameraOrbitPitch(pitch: number): number {
  return Math.max(
    CAMERA_ORBIT_MIN_PITCH,
    Math.min(CAMERA_ORBIT_MAX_PITCH, pitch),
  );
}

export const DEFAULT_CAMERA_ORBIT_PITCH = clampCameraOrbitPitch(
  Math.atan2(10, 18),
);

export interface GameGlobals {
  scene: Scene;
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;
  oceanMaterial: ShaderMaterial | null;
  boatTemplates: Map<string, Object3D>;
  keysPressed: Set<string>;
  cameraOrbit: CameraOrbit;
  joltWorld: JoltWorld | null;
  initialized: boolean;
}

let activeGlobals: GameGlobals | null = null;

export function setActiveGame(_world: World, globals: GameGlobals): void {
  activeGlobals = globals;
}

export function getActiveGlobals(): GameGlobals | null {
  return activeGlobals;
}

export function getKeysPressed(): Set<string> {
  return activeGlobals?.keysPressed ?? new Set();
}

export function clearActiveGame(): void {
  activeGlobals = null;
}

export function getGlobalsFromSystem(
  systemGlobals: Record<string, unknown>,
): GameGlobals {
  return systemGlobals as unknown as GameGlobals;
}

export function num(value: number | null, fallback = 0): number {
  return value ?? fallback;
}
