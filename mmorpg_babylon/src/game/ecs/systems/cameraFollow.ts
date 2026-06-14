import { Vector3 } from "@babylonjs/core";
import { system, System } from "@lastolivegames/becsy";

import { gameContext } from "../../gameContext";
import { PlayerControlled, Transform } from "../components";

const FOLLOW_DIST = 18;
const FOLLOW_HEIGHT = 10;

@system
export class CameraFollowSystem extends System {
  sked = this.schedule((s) => s.afterWritersOf(Transform));

  private readonly players = this.query((q) =>
    q.current.with(PlayerControlled).read.and.with(Transform).read,
  );

  execute(): void {
    const camera = gameContext.camera;
    if (!camera) return;

    for (const entity of this.players.current) {
      const transform = entity.read(Transform);

      const desiredX = transform.x - Math.sin(transform.yaw) * FOLLOW_DIST;
      const desiredZ = transform.z - Math.cos(transform.yaw) * FOLLOW_DIST;
      const desiredY = FOLLOW_HEIGHT;

      const lerp = 1 - Math.pow(0.001, this.delta);
      camera.position.x += (desiredX - camera.position.x) * lerp;
      camera.position.y += (desiredY - camera.position.y) * lerp;
      camera.position.z += (desiredZ - camera.position.z) * lerp;

      camera.setTarget(
        new Vector3(transform.x, transform.y + 1, transform.z),
      );
    }
  }
}
