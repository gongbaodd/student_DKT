import { createSystem } from "elics";

import { getGlobalsFromSystem, num } from "../../globals";
import { Facing, PlayerControlled, Velocity } from "../components";

const MOVE_SPEED = 12;

const queries = {
  players: { required: [PlayerControlled, Facing, Velocity] },
};

export class PlayerInputSystem extends createSystem(queries) {
  update(): void {
    const keys = getGlobalsFromSystem(this.globals).keysPressed;
    const forward = keys.has("w") || keys.has("W");
    const back = keys.has("s") || keys.has("S");
    const left = keys.has("a") || keys.has("A");
    const right = keys.has("d") || keys.has("D");

    for (const entity of this.queries.players.entities) {
      const facingYaw = num(entity.getValue(Facing, "yaw"));

      let localX = 0;
      let localZ = 0;
      if (forward) localZ += 1;
      if (back) localZ -= 1;
      if (left) localX -= 1;
      if (right) localX += 1;

      if (localX !== 0 || localZ !== 0) {
        const len = Math.hypot(localX, localZ);
        localX /= len;
        localZ /= len;
      }

      const sin = Math.sin(facingYaw);
      const cos = Math.cos(facingYaw);
      const worldX = localX * cos + localZ * sin;
      const worldZ = -localX * sin + localZ * cos;

      entity.setValue(Velocity, "vx", worldX * MOVE_SPEED);
      entity.setValue(Velocity, "vz", worldZ * MOVE_SPEED);
    }
  }
}
