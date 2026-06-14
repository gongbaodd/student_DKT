import { Vector3 } from "@babylonjs/core";
import { createSystem } from "elics";

import { getGlobalsFromSystem, num } from "../../globals";
import { PlayerControlled, Transform } from "../components";

const FOLLOW_DIST = 18;
const FOLLOW_HEIGHT = 10;

const queries = {
  players: { required: [PlayerControlled, Transform] },
};

export class CameraFollowSystem extends createSystem(queries) {
  update(delta: number): void {
    const { camera } = getGlobalsFromSystem(this.globals);
    if (!camera) return;

    for (const entity of this.queries.players.entities) {
      const x = num(entity.getValue(Transform, "x"));
      const y = num(entity.getValue(Transform, "y"));
      const z = num(entity.getValue(Transform, "z"));
      const yaw = num(entity.getValue(Transform, "yaw"));

      const desiredX = x - Math.sin(yaw) * FOLLOW_DIST;
      const desiredZ = z - Math.cos(yaw) * FOLLOW_DIST;
      const desiredY = FOLLOW_HEIGHT;

      const lerp = 1 - Math.pow(0.001, delta);
      camera.position.x += (desiredX - camera.position.x) * lerp;
      camera.position.y += (desiredY - camera.position.y) * lerp;
      camera.position.z += (desiredZ - camera.position.z) * lerp;

      camera.setTarget(new Vector3(x, y + 1, z));
    }
  }
}
