import { createSystem } from "elics";
import { Vector3 } from "three";

import { getGlobalsFromSystem, clampCameraOrbitPitch, num } from "../../globals";
import { PlayerControlled, Transform } from "../components";

const lookTarget = new Vector3();

const queries = {
  players: { required: [PlayerControlled, Transform] },
};

export class CameraFollowSystem extends createSystem(queries) {
  update(delta: number): void {
    const { camera, cameraOrbit } = getGlobalsFromSystem(this.globals);
    if (!camera) return;

    for (const entity of this.queries.players.entities) {
      const x = num(entity.getValue(Transform, "x"));
      const y = num(entity.getValue(Transform, "y"));
      const z = num(entity.getValue(Transform, "z"));
      const orbitYaw = cameraOrbit.yaw;
      const orbitPitch = clampCameraOrbitPitch(cameraOrbit.pitch);
      cameraOrbit.pitch = orbitPitch;

      const horizDist = cameraOrbit.distance * Math.cos(orbitPitch);
      const vertOffset = cameraOrbit.distance * Math.sin(orbitPitch);
      const desiredX = x - Math.sin(orbitYaw) * horizDist;
      const desiredZ = z - Math.cos(orbitYaw) * horizDist;
      const desiredY = y + vertOffset;

      const lerp = 1 - Math.pow(0.001, delta);
      camera.position.x += (desiredX - camera.position.x) * lerp;
      camera.position.y += (desiredY - camera.position.y) * lerp;
      camera.position.z += (desiredZ - camera.position.z) * lerp;

      lookTarget.set(x, y + 1, z);
      camera.lookAt(lookTarget);
    }
  }
}
