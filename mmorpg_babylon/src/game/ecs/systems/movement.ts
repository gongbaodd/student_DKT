import { createSystem } from "elics";

import { num } from "../../globals";
import { Facing, Transform, Velocity } from "../components";

const WORLD_BOUNDS = 180;
const TURN_LERP = 8;

const queries = {
  movers: { required: [Velocity, Transform, Facing] },
};

export class MovementSystem extends createSystem(queries) {
  update(delta: number): void {
    for (const entity of this.queries.movers.entities) {
      const vx = num(entity.getValue(Velocity, "vx"));
      const vz = num(entity.getValue(Velocity, "vz"));

      let x = num(entity.getValue(Transform, "x")) + vx * delta;
      let z = num(entity.getValue(Transform, "z")) + vz * delta;

      x = Math.max(-WORLD_BOUNDS, Math.min(WORLD_BOUNDS, x));
      z = Math.max(-WORLD_BOUNDS, Math.min(WORLD_BOUNDS, z));

      entity.setValue(Transform, "x", x);
      entity.setValue(Transform, "z", z);

      if (vx !== 0 || vz !== 0) {
        const targetYaw = Math.atan2(vx, vz);
        let facingYaw = num(entity.getValue(Facing, "yaw"));
        let diff = targetYaw - facingYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        facingYaw += diff * Math.min(1, TURN_LERP * delta);
        entity.setValue(Facing, "yaw", facingYaw);
        entity.setValue(Transform, "yaw", facingYaw);
      }
    }
  }
}
