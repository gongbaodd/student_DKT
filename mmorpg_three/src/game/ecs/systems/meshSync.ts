import { createSystem } from "elics";
import type { Object3D } from "three";

import { num } from "../../globals";
import { MeshRef, Transform } from "../components";

const queries = {
  synced: { required: [Transform, MeshRef] },
};

export class MeshSyncSystem extends createSystem(queries) {
  update(): void {
    for (const entity of this.queries.synced.entities) {
      const object3D = entity.getValue(MeshRef, "object3D") as Object3D | null;
      if (!object3D) continue;

      object3D.position.set(
        num(entity.getValue(Transform, "x")),
        num(entity.getValue(Transform, "y")),
        num(entity.getValue(Transform, "z")),
      );
      object3D.rotation.y = num(entity.getValue(Transform, "yaw"));
      object3D.rotation.z = num(entity.getValue(Transform, "roll"));
    }
  }
}
