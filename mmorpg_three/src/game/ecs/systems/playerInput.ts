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

    for (const entity of this.queries.players.entities) {
      const facingYaw = num(entity.getValue(Facing, "yaw"));
      const vx = forward ? Math.sin(facingYaw) * MOVE_SPEED : 0;
      const vz = forward ? Math.cos(facingYaw) * MOVE_SPEED : 0;

      entity.setValue(Velocity, "vx", vx);
      entity.setValue(Velocity, "vz", vz);
    }
  }
}
