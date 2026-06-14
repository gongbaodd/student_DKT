import { createSystem } from "elics";

import { num } from "../../globals";
import { Bobbing, Transform } from "../components";

const queries = {
  bobbers: { required: [Bobbing, Transform] },
};

export class BobbingSystem extends createSystem(queries) {
  private elapsed = 0;

  update(delta: number): void {
    this.elapsed += delta;

    for (const entity of this.queries.bobbers.entities) {
      const baseY = num(entity.getValue(Bobbing, "baseY"));
      const amplitude = num(entity.getValue(Bobbing, "amplitude"));
      const phase = num(entity.getValue(Bobbing, "phase"));
      const rollAmount = num(entity.getValue(Bobbing, "rollAmount"));

      const wave =
        Math.sin(this.elapsed * 1.4 + phase) * amplitude +
        Math.sin(this.elapsed * 2.1 + phase * 1.7) * amplitude * 0.35;

      entity.setValue(Transform, "y", baseY + wave);
      entity.setValue(
        Transform,
        "roll",
        Math.sin(this.elapsed * 1.8 + phase) * rollAmount,
      );
    }
  }
}
