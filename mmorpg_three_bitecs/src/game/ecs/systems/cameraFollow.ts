import { query } from "bitecs";
import type { World } from "bitecs";
import { Vector3 } from "three";

import { clampCameraOrbitPitch, num } from "../../globals";
import type { GameGlobals } from "../../globals";
import { PlayerControlled, Transform } from "../components";
import type { GameSystem } from "../systemRunner";

const lookTarget = new Vector3();

export function createCameraFollowSystem(): GameSystem {
  return {
    priority: 200,
    update(world: World, ctx: GameGlobals, delta: number): void {
      const { camera, cameraOrbit } = ctx;
      if (!camera) return;

      for (const eid of query(world, [PlayerControlled, Transform])) {
        const x = num(Transform.x[eid]);
        const y = num(Transform.y[eid]);
        const z = num(Transform.z[eid]);
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
    },
  };
}
