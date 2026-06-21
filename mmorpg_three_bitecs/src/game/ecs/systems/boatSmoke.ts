import { query } from "bitecs";
import type { World } from "bitecs";
import { QuarksUtil } from "three.quarks";

import { num } from "../../globals";
import type { GameGlobals } from "../../globals";
import { ExhaustSmoke, PlayerControlled, Throttle } from "../components";
import type { GameSystem } from "../systemRunner";

export function createBoatSmokeSystem(): GameSystem {
  return {
    priority: 700,
    update(world: World, ctx: GameGlobals, delta: number): void {
      const { quarksRenderer } = ctx;
      if (!quarksRenderer) return;

      for (const eid of query(world, [PlayerControlled, Throttle, ExhaustSmoke])) {
        const effect = ExhaustSmoke.effectRoot[eid];
        if (!effect) continue;

        const throttle = num(Throttle.amount[eid]);
        if (throttle > 0) {
          effect.visible = true;
          QuarksUtil.play(effect);
        } else {
          QuarksUtil.stop(effect);
          effect.visible = false;
        }
      }

      quarksRenderer.update(delta);
    },
  };
}
