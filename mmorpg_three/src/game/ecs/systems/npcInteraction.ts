import { createSystem } from "elics";
import type { Object3D } from "three";
import { Vector3 } from "three";

import {
  closeNpcMenu,
  drainPendingNpcActions,
  getNpcMenuState,
  updateNpcMenuPosition,
} from "../../interaction/npcInteractionStore";
import { unregisterNpcPickTarget } from "../../interaction/npcPickTargets";
import { getGlobalsFromSystem, num } from "../../globals";
import { removeBoatBody } from "../../physics/boatBody";
import { spawnBangEffect } from "../../three/createBangEffect";
import { MeshRef, Npc, PhysicsBody, PlayerControlled, Transform } from "../components";

const BANG_TTL = 2.5;

interface ActiveBang {
  effect: Object3D;
  ttl: number;
}

const worldPos = new Vector3();

export class NpcInteractionSystem extends createSystem({}) {
  private activeBangs: ActiveBang[] = [];

  update(delta: number): void {
    const globals = getGlobalsFromSystem(this.globals);
    const { camera, renderer, scene, joltWorld, quarksRenderer } = globals;

    this.updateMenuPosition(camera, renderer.domElement);
    this.processPendingActions(scene, joltWorld, quarksRenderer);
    this.tickActiveBangs(delta, scene);
  }

  private updateMenuPosition(
    camera: import("three").PerspectiveCamera,
    canvas: HTMLCanvasElement,
  ): void {
    const menu = getNpcMenuState();
    if (!menu) return;

    const entity = this.world.entityManager.getEntityByIndex(menu.entityIndex);
    if (!entity?.active || !entity.hasComponent(Npc)) {
      closeNpcMenu();
      return;
    }

    const object3D = entity.getValue(MeshRef, "object3D") as Object3D | null;
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

  private processPendingActions(
    scene: import("three").Scene,
    joltWorld: import("../../physics/joltWorld").JoltWorld | null,
    quarksRenderer: import("three.quarks").BatchedRenderer | null,
  ): void {
    const globals = getGlobalsFromSystem(this.globals);

    for (const { entityIndex } of drainPendingNpcActions()) {
      const entity = this.world.entityManager.getEntityByIndex(entityIndex);
      if (!entity?.active || !entity.hasComponent(Npc) || entity.hasComponent(PlayerControlled)) {
        continue;
      }

      const object3D = entity.getValue(MeshRef, "object3D") as Object3D | null;
      const x = num(entity.getValue(Transform, "x"));
      const y = num(entity.getValue(Transform, "y"));
      const z = num(entity.getValue(Transform, "z"));

      const effect = spawnBangEffect(scene, x, y, z, quarksRenderer);
      this.activeBangs.push({ effect, ttl: BANG_TTL });

      if (object3D) {
        unregisterNpcPickTarget(globals, object3D);
        object3D.visible = false;
        scene.remove(object3D);
      }

      if (joltWorld) {
        const bodyId = num(entity.getValue(PhysicsBody, "bodyId"), -1);
        removeBoatBody(joltWorld, bodyId);
      }

      entity.destroy();
    }
  }

  private tickActiveBangs(delta: number, scene: import("three").Scene): void {
    const remaining: ActiveBang[] = [];
    for (const bang of this.activeBangs) {
      const nextTtl = bang.ttl - delta;
      if (nextTtl > 0) {
        remaining.push({ effect: bang.effect, ttl: nextTtl });
      } else {
        scene.remove(bang.effect);
      }
    }
    this.activeBangs = remaining;
  }
}
