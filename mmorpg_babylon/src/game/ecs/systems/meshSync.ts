import { system, System } from "@lastolivegames/becsy";

import { MeshRef, Transform } from "../components";

@system
export class MeshSyncSystem extends System {
  sked = this.schedule((s) => s.afterWritersOf(Transform));

  private readonly synced = this.query((q) =>
    q.current.with(Transform).read.and.with(MeshRef).read,
  );

  execute(): void {
    for (const entity of this.synced.current) {
      const transform = entity.read(Transform);
      const meshRef = entity.read(MeshRef);
      const node = meshRef.node;
      if (!node) continue;

      node.position.x = transform.x;
      node.position.y = transform.y;
      node.position.z = transform.z;
      node.rotation.y = transform.yaw;
      node.rotation.z = transform.roll;
    }
  }
}
