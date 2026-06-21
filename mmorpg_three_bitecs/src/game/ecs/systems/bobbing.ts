import { query } from "bitecs";
import type { World } from "bitecs";

import { num } from "../../globals";
import type { GameGlobals } from "../../globals";
import { Bobbing, Transform } from "../components";
import type { GameSystem } from "../systemRunner";

export function createBobbingSystem(): GameSystem {
  let elapsed = 0;

  return {
    priority: 500,
    update(world: World, _ctx: GameGlobals, delta: number): void {
      elapsed += delta;

      for (const eid of query(world, [Bobbing, Transform])) {
        const baseY = num(Bobbing.baseY[eid]);
        const amplitude = num(Bobbing.amplitude[eid]);
        const phase = num(Bobbing.phase[eid]);
        const rollAmount = num(Bobbing.rollAmount[eid]);

        const wave =
          Math.sin(elapsed * 1.4 + phase) * amplitude +
          Math.sin(elapsed * 2.1 + phase * 1.7) * amplitude * 0.35;

        Transform.y[eid] = baseY + wave;
        Transform.roll[eid] = Math.sin(elapsed * 1.8 + phase) * rollAmount;
      }
    },
  };
}
