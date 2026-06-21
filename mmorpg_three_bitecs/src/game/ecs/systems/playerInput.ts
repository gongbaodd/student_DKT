import { query } from "bitecs";
import type { World } from "bitecs";

import type { GameGlobals } from "../../globals";
import { PlayerControlled, Throttle } from "../components";
import type { GameSystem } from "../systemRunner";

export function createPlayerInputSystem(): GameSystem {
  return {
    priority: 300,
    update(world: World, ctx: GameGlobals): void {
      const forward = ctx.keysPressed.has("w") || ctx.keysPressed.has("W");

      for (const eid of query(world, [PlayerControlled, Throttle])) {
        Throttle.amount[eid] = forward ? 1 : 0;
      }
    },
  };
}
