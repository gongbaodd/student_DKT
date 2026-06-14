import { createSystem } from "elics";

import { BOAT_DEFS, BASE_BOAT_Y, buildSpawnLayout } from "../../assets/boatCatalog";
import { cloneBoat, loadBoatTemplate } from "../../babylon/loadBoat";
import { createOcean } from "../../babylon/createOcean";
import { getGlobalsFromSystem } from "../../globals";
import {
  BoatKind,
  Bobbing,
  Facing,
  MeshRef,
  PlayerControlled,
  Transform,
  Velocity,
} from "../components";

export class InitWorldSystem extends createSystem({}) {
  init(): void {
    const globals = getGlobalsFromSystem(this.globals);

    globals.oceanMaterial = createOcean(globals.scene);

    const spawns = buildSpawnLayout();

    for (const spawn of spawns) {
      const template = globals.boatTemplates.get(spawn.id);
      if (!template) continue;

      const node = cloneBoat(
        template,
        `boat-${spawn.id}-${spawn.isPlayer ? "player" : "npc"}`,
      );
      node.position.x = spawn.x;
      node.position.y = BASE_BOAT_Y;
      node.position.z = spawn.z;
      node.rotation.y = spawn.yaw;

      const entity = this.createEntity();
      entity.addComponent(Transform, {
        x: spawn.x,
        y: BASE_BOAT_Y,
        z: spawn.z,
        yaw: spawn.yaw,
        roll: 0,
      });
      entity.addComponent(MeshRef, { node });
      entity.addComponent(BoatKind, { kind: spawn.id });
      entity.addComponent(Bobbing, {
        baseY: BASE_BOAT_Y,
        amplitude: spawn.isPlayer ? 0.08 : 0.15,
        phase: Math.random() * Math.PI * 2,
        rollAmount: spawn.isPlayer ? 0.03 : 0.06,
      });

      if (spawn.isPlayer) {
        entity.addComponent(PlayerControlled);
        entity.addComponent(Facing, { yaw: spawn.yaw });
        entity.addComponent(Velocity, { vx: 0, vz: 0 });
      }
    }

    globals.initialized = true;
  }
}

export async function preloadBoatTemplates(
  scene: import("@babylonjs/core/scene").Scene,
  boatTemplates: Map<string, import("@babylonjs/core/Meshes/transformNode").TransformNode>,
): Promise<void> {
  await Promise.all(
    BOAT_DEFS.map(async (def) => {
      const template = await loadBoatTemplate(scene, def.id, def.scale);
      boatTemplates.set(def.id, template);
    }),
  );
}
