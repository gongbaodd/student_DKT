import type { World } from "bitecs";
import type { PerspectiveCamera, Scene, ShaderMaterial, WebGLRenderer } from "three";
import type { Object3D } from "three";
import type { BatchedRenderer } from "three.quarks";

import type { JoltWorld } from "./physics/joltWorld";

export interface NpcPickEntry {
  root: Object3D;
  entityIndex: number;
}

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
  quarksRenderer: BatchedRenderer | null;
  initialized: boolean;
  npcPickTargets: NpcPickEntry[];
}

let activeWorld: World | null = null;
let activeGlobals: GameGlobals | null = null;

export function setActiveGame(world: World, globals: GameGlobals): void {
  activeWorld = world;
  activeGlobals = globals;
}

export function getActiveWorld(): World | null {
  return activeWorld;
}

export function getActiveGlobals(): GameGlobals | null {
  return activeGlobals;
}

export function getKeysPressed(): Set<string> {
  return activeGlobals?.keysPressed ?? new Set();
}

export function clearActiveGame(): void {
  activeWorld = null;
  activeGlobals = null;
}

export function num(value: number | null | undefined, fallback = 0): number {
  return value ?? fallback;
}
