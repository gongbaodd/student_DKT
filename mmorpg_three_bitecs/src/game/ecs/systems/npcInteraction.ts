import {
  entityExists,
  hasComponent,
  removeEntity,
} from "bitecs";
import type { World } from "bitecs";
import type { Object3D } from "three";
import { Vector3 } from "three";

import {
  closeNpcMenu,
  drainPendingNpcActions,
  getNpcMenuState,
  updateNpcMenuPosition,
} from "../../interaction/npcInteractionStore";
import { unregisterNpcPickTarget } from "../../interaction/npcPickTargets";
import { num } from "../../globals";
import type { GameGlobals } from "../../globals";
import { removeBoatBody } from "../../physics/boatBody";
import { spawnBangEffect } from "../../three/createBangEffect";
import {
  boatKindByEid,
  MeshRef,
  Npc,
  PhysicsBody,
  PlayerControlled,
  Transform,
} from "../components";
import type { GameSystem } from "../systemRunner";

const BANG_TTL = 2.5;

interface ActiveBang {
  effect: Object3D;
  ttl: number;
}

const worldPos = new Vector3();

export function createNpcInteractionSystem(): GameSystem {
  const activeBangs: ActiveBang[] = [];

  return {
    priority: 350,
    update(world: World, ctx: GameGlobals, delta: number): void {
      const { camera, renderer, scene, joltWorld, quarksRenderer } = ctx;

      updateMenuPosition(world, camera, renderer.domElement);
      processPendingActions(world, ctx, scene, joltWorld, quarksRenderer);
      tickActiveBangs(delta, scene);
    },
  };

  function updateMenuPosition(
    world: World,
    camera: import("three").PerspectiveCamera,
    canvas: HTMLCanvasElement,
  ): void {
    const menu = getNpcMenuState();
    if (!menu) return;

    const eid = menu.entityIndex;
    if (!entityExists(world, eid) || !hasComponent(world, eid, Npc)) {
      closeNpcMenu();
      return;
    }

    const object3D = MeshRef.object3D[eid];
    if (!object3D) {
      closeNpcMenu();
      return;
    }

    object3D.getWorldPosition(worldPos);
    worldPos.project(camera);

    const rect = canvas.getBoundingClientRect();
    const screenX = rect.left + ((worldPos.x + 1) / 2) * rect.width;
    const screenY = rect.top + ((1 - worldPos.y) / 2) * rect.height;
    updateNpcMenuPosition(screenX, screenY);
  }

  function processPendingActions(
    world: World,
    globals: GameGlobals,
    scene: import("three").Scene,
    joltWorld: import("../../physics/joltWorld").JoltWorld | null,
    quarksRenderer: import("three.quarks").BatchedRenderer | null,
  ): void {
    for (const { entityIndex } of drainPendingNpcActions()) {
      const eid = entityIndex;
      if (
        !entityExists(world, eid) ||
        !hasComponent(world, eid, Npc) ||
        hasComponent(world, eid, PlayerControlled)
      ) {
        continue;
      }

      const object3D = MeshRef.object3D[eid];
      const x = num(Transform.x[eid]);
      const y = num(Transform.y[eid]);
      const z = num(Transform.z[eid]);

      const effect = spawnBangEffect(scene, x, y, z, quarksRenderer);
      activeBangs.push({ effect, ttl: BANG_TTL });

      if (object3D) {
        unregisterNpcPickTarget(globals, object3D);
        object3D.visible = false;
        scene.remove(object3D);
      }

      if (joltWorld) {
        const bodyId = num(PhysicsBody.bodyId[eid], -1);
        removeBoatBody(joltWorld, bodyId);
      }

      boatKindByEid.delete(eid);
      removeEntity(world, eid);
    }
  }

  function tickActiveBangs(delta: number, scene: import("three").Scene): void {
    const remaining: ActiveBang[] = [];
    for (const bang of activeBangs) {
      const nextTtl = bang.ttl - delta;
      if (nextTtl > 0) {
        remaining.push({ effect: bang.effect, ttl: nextTtl });
      } else {
        scene.remove(bang.effect);
      }
    }
    activeBangs.length = 0;
    activeBangs.push(...remaining);
  }
}
