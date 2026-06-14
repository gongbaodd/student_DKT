import type { Engine, Scene, ShaderMaterial, UniversalCamera } from "@babylonjs/core";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { World } from "@lastolivegames/becsy";

export const gameContext = {
  scene: null as Scene | null,
  engine: null as Engine | null,
  camera: null as UniversalCamera | null,
  oceanMaterial: null as ShaderMaterial | null,
  boatTemplates: new Map<string, TransformNode>(),
  keysPressed: new Set<string>(),
  world: null as World | null,
  initialized: false,
};
