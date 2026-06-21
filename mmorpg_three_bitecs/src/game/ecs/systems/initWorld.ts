import { addComponent, addEntity } from "bitecs";
import type { World } from "bitecs";
import { QuarksUtil } from "three.quarks";

import {
  BOAT_DEFS,
  BASE_BOAT_Y,
  buildSpawnLayout,
  type BoatKindId,
} from "../../assets/boatCatalog";
import type { GameGlobals } from "../../globals";
import { createBoatBody } from "../../physics/boatBody";
import { registerNpcPickTarget } from "../../interaction/npcPickTargets";
import { cloneBoat, loadBoatTemplate } from "../../three/loadBoat";
import { createBoatSmoke } from "../../three/createBoatSmoke";
import { createOcean } from "../../three/createOcean";
import {
  Bobbing,
  boatKindByEid,
  ExhaustSmoke,
  Facing,
  MeshRef,
  Npc,
  PlayerControlled,
  PhysicsBody,
  Throttle,
  Transform,
} from "../components";

export function initWorld(world: World, globals: GameGlobals): void {
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

    const eid = addEntity(world);
    object3D.userData.entityIndex = eid;
    object3D.userData.isNpc = !spawn.isPlayer;

    addComponent(world, eid, Transform);
    Transform.x[eid] = spawn.x;
    Transform.y[eid] = BASE_BOAT_Y;
    Transform.z[eid] = spawn.z;
    Transform.yaw[eid] = spawn.yaw;
    Transform.roll[eid] = 0;

    addComponent(world, eid, MeshRef);
    MeshRef.object3D[eid] = object3D;

    boatKindByEid.set(eid, spawn.id);

    addComponent(world, eid, PhysicsBody);
    PhysicsBody.bodyId[eid] =
      globals.joltWorld != null
        ? createBoatBody(globals.joltWorld, spawn.id, spawn.x, spawn.z, spawn.yaw, {
            static: !spawn.isPlayer,
          })
        : -1;

    addComponent(world, eid, Bobbing);
    Bobbing.baseY[eid] = BASE_BOAT_Y;
    Bobbing.amplitude[eid] = spawn.isPlayer ? 0.08 : 0.15;
    Bobbing.phase[eid] = Math.random() * Math.PI * 2;
    Bobbing.rollAmount[eid] = spawn.isPlayer ? 0.03 : 0.06;

    if (!spawn.isPlayer) {
      addComponent(world, eid, Npc);
      registerNpcPickTarget(globals, object3D, eid);
    }

    if (spawn.isPlayer) {
      addComponent(world, eid, PlayerControlled);
      addComponent(world, eid, Facing);
      Facing.yaw[eid] = spawn.yaw;
      addComponent(world, eid, Throttle);
      Throttle.amount[eid] = 0;

      const smoke = createBoatSmoke(spawn.id as BoatKindId);
      object3D.add(smoke);
      if (globals.quarksRenderer) {
        QuarksUtil.addToBatchRenderer(smoke, globals.quarksRenderer);
      }
      addComponent(world, eid, ExhaustSmoke);
      ExhaustSmoke.effectRoot[eid] = smoke;
    }
  }

  globals.initialized = true;
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
