import type { Engine, Scene, ShaderMaterial, UniversalCamera } from "@babylonjs/core";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { World } from "elics";

export interface GameGlobals {
  scene: Scene;
  engine: Engine;
  camera: UniversalCamera;
  oceanMaterial: ShaderMaterial | null;
  boatTemplates: Map<string, TransformNode>;
  keysPressed: Set<string>;
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
