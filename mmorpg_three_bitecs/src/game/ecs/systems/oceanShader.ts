import type { World } from "bitecs";

import type { GameGlobals } from "../../globals";
import type { GameSystem } from "../systemRunner";

export function createOceanShaderSystem(): GameSystem {
  let elapsed = 0;

  return {
    priority: 100,
    update(_world: World, ctx: GameGlobals, delta: number): void {
      const material = ctx.oceanMaterial;
      if (!material) return;

      elapsed += delta;
      material.uniforms.time.value = elapsed;
    },
  };
}
