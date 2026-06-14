import { createSystem } from "elics";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";

import { num } from "../../globals";
import { MeshRef, Transform } from "../components";

const queries = {
  synced: { required: [Transform, MeshRef] },
};

export class MeshSyncSystem extends createSystem(queries) {
  update(): void {
    for (const entity of this.queries.synced.entities) {
      const node = entity.getValue(MeshRef, "node") as TransformNode | null;
      if (!node) continue;

      node.position.x = num(entity.getValue(Transform, "x"));
      node.position.y = num(entity.getValue(Transform, "y"));
      node.position.z = num(entity.getValue(Transform, "z"));
      node.rotation.y = num(entity.getValue(Transform, "yaw"));
      node.rotation.z = num(entity.getValue(Transform, "roll"));
    }
  }
}
