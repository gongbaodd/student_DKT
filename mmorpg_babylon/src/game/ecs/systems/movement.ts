import { system, System } from "@lastolivegames/becsy";

import { Facing, Transform, Velocity } from "../components";

const WORLD_BOUNDS = 180;
const TURN_LERP = 8;

@system
export class MovementSystem extends System {
  sked = this.schedule((s) =>
    s.afterWritersOf(Velocity).beforeWritersOf(Transform),
  );

  private readonly movers = this.query((q) =>
    q.current
      .with(Velocity)
      .read.and.with(Transform)
      .write.and.with(Facing)
      .write,
  );

  execute(): void {
    for (const entity of this.movers.current) {
      const velocity = entity.read(Velocity);
      const transform = entity.write(Transform);
      const facing = entity.write(Facing);

      transform.x += velocity.vx * this.delta;
      transform.z += velocity.vz * this.delta;

      transform.x = Math.max(-WORLD_BOUNDS, Math.min(WORLD_BOUNDS, transform.x));
      transform.z = Math.max(-WORLD_BOUNDS, Math.min(WORLD_BOUNDS, transform.z));

      if (velocity.vx !== 0 || velocity.vz !== 0) {
        const targetYaw = Math.atan2(velocity.vx, velocity.vz);
        let diff = targetYaw - facing.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        facing.yaw += diff * Math.min(1, TURN_LERP * this.delta);
        transform.yaw = facing.yaw;
      }
    }
  }
}
