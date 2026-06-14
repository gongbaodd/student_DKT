import { createSystem } from "elics";

import { BOAT_DEFS, BASE_BOAT_Y, buildSpawnLayout, type BoatKindId } from "../../assets/boatCatalog";
import { getGlobalsFromSystem } from "../../globals";
import { createBoatBody } from "../../physics/boatBody";
import { cloneBoat, loadBoatTemplate } from "../../three/loadBoat";
import { createBoatSmoke } from "../../three/createBoatSmoke";
import { QuarksUtil } from "three.quarks";
import { createOcean } from "../../three/createOcean";
import {
  BoatKind,
  Bobbing,
  ExhaustSmoke,
  Facing,
  MeshRef,
  PlayerControlled,
  PhysicsBody,
  Throttle,
  Transform,
} from "../components";

export class InitWorldSystem extends createSystem({}) {
  init(): void {
    const globals = getGlobalsFromSystem(this.globals);

    globals.oceanMaterial = createOcean(globals.scene);

    const spawns = buildSpawnLayout();

    for (const spawn of spawns) {
      const template = globals.boatTemplates.get(spawn.id);
      if (!template) continue;

      const object3D = cloneBoat(
        template,
        `boat-${spawn.id}-${spawn.isPlayer ? "player" : "npc"}`,
      );
      object3D.position.set(spawn.x, BASE_BOAT_Y, spawn.z);
      object3D.rotation.y = spawn.yaw;
      globals.scene.add(object3D);

      const entity = this.createEntity();
      entity.addComponent(Transform, {
        x: spawn.x,
        y: BASE_BOAT_Y,
        z: spawn.z,
        yaw: spawn.yaw,
        roll: 0,
      });
      entity.addComponent(MeshRef, { object3D });
      entity.addComponent(BoatKind, { kind: spawn.id });
      entity.addComponent(PhysicsBody, {
        bodyId:
          globals.joltWorld != null
            ? createBoatBody(globals.joltWorld, spawn.id, spawn.x, spawn.z, spawn.yaw)
            : -1,
      });
      entity.addComponent(Bobbing, {
        baseY: BASE_BOAT_Y,
        amplitude: spawn.isPlayer ? 0.08 : 0.15,
        phase: Math.random() * Math.PI * 2,
        rollAmount: spawn.isPlayer ? 0.03 : 0.06,
      });

      if (spawn.isPlayer) {
        entity.addComponent(PlayerControlled);
        entity.addComponent(Facing, { yaw: spawn.yaw });
        entity.addComponent(Throttle, { amount: 0 });

        const smoke = createBoatSmoke(spawn.id as BoatKindId);
        object3D.add(smoke);
        if (globals.quarksRenderer) {
          QuarksUtil.addToBatchRenderer(smoke, globals.quarksRenderer);
        }
        entity.addComponent(ExhaustSmoke, { effectRoot: smoke });
      }
    }

    globals.initialized = true;
  }
}

export async function preloadBoatTemplates(
  scene: import("three").Scene,
  boatTemplates: Map<string, import("three").Object3D>,
): Promise<void> {
  await Promise.all(
    BOAT_DEFS.map(async (def) => {
      const template = await loadBoatTemplate(scene, def.id, def.scale);
      boatTemplates.set(def.id, template);
    }),
  );
}
