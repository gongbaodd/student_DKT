import { query } from "bitecs";
import type { World } from "bitecs";

import { num } from "../../globals";
import { MeshRef, Transform } from "../components";
import type { GameSystem } from "../systemRunner";

export function createMeshSyncSystem(): GameSystem {
  return {
    priority: 600,
    update(world: World): void {
      for (const eid of query(world, [Transform, MeshRef])) {
        const object3D = MeshRef.object3D[eid];
        if (!object3D) continue;

        object3D.position.set(
          num(Transform.x[eid]),
          num(Transform.y[eid]),
          num(Transform.z[eid]),
        );
        object3D.rotation.y = num(Transform.yaw[eid]);
        object3D.rotation.z = num(Transform.roll[eid]);
      }
    },
  };
}
