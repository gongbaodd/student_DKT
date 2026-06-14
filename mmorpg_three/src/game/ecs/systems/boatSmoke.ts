import { createSystem } from "elics";
import type { Object3D } from "three";
import { QuarksUtil } from "three.quarks";

import { getGlobalsFromSystem, num } from "../../globals";
import { ExhaustSmoke, PlayerControlled, Throttle } from "../components";

const queries = {
  players: { required: [PlayerControlled, Throttle, ExhaustSmoke] },
};

export class BoatSmokeSystem extends createSystem(queries) {
  update(delta: number): void {
    const { quarksRenderer } = getGlobalsFromSystem(this.globals);
    if (!quarksRenderer) return;

    for (const entity of this.queries.players.entities) {
      const effect = entity.getValue(ExhaustSmoke, "effectRoot") as Object3D | null;
      if (!effect) continue;

      const throttle = num(entity.getValue(Throttle, "amount"));
      if (throttle > 0) {
        effect.visible = true;
        QuarksUtil.play(effect);
      } else {
        QuarksUtil.stop(effect);
        effect.visible = false;
      }
    }

    quarksRenderer.update(delta);
  }
}
