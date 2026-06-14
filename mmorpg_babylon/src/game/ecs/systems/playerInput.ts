import { system, System } from "@lastolivegames/becsy";

import { gameContext } from "../../gameContext";
import { Facing, PlayerControlled, Velocity } from "../components";

const MOVE_SPEED = 12;

@system
export class PlayerInputSystem extends System {
  sked = this.schedule((s) => s.beforeWritersOf(Facing));

  private readonly players = this.query((q) =>
    q.current
      .with(PlayerControlled)
      .read.and.with(Facing)
      .read.and.with(Velocity)
      .write,
  );

  execute(): void {
    const keys = gameContext.keysPressed;
    const forward = keys.has("w") || keys.has("W");
    const back = keys.has("s") || keys.has("S");
    const left = keys.has("a") || keys.has("A");
    const right = keys.has("d") || keys.has("D");

    for (const entity of this.players.current) {
      const facing = entity.read(Facing);
      const velocity = entity.write(Velocity);

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

      const sin = Math.sin(facing.yaw);
      const cos = Math.cos(facing.yaw);
      const worldX = localX * cos + localZ * sin;
      const worldZ = -localX * sin + localZ * cos;

      velocity.vx = worldX * MOVE_SPEED;
      velocity.vz = worldZ * MOVE_SPEED;
    }
  }
}
