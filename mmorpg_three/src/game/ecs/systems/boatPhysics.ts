import { createSystem } from "elics";
import type { PerspectiveCamera } from "three";
import { Vector3 } from "three";

import { getGlobalsFromSystem, num } from "../../globals";
import { quatToYaw, yawToQuat } from "../../physics/joltWorld";
import {
  Facing,
  PhysicsBody,
  PlayerControlled,
  Throttle,
  Transform,
} from "../components";

const MAX_SPEED = 12;
const COAST_DAMPING = 4;
const camForward = new Vector3();

const queries = {
  ships: { required: [PhysicsBody, Transform] },
  players: { required: [PlayerControlled, PhysicsBody, Facing, Throttle, Transform] },
};

function cameraForwardYaw(camera: PerspectiveCamera): number {
  camera.getWorldDirection(camForward);
  camForward.y = 0;
  if (camForward.lengthSq() < 1e-8) {
    return 0;
  }
  camForward.normalize();
  return Math.atan2(camForward.x, camForward.z);
}

export class BoatPhysicsSystem extends createSystem(queries) {
  update(delta: number): void {
    const { joltWorld, camera } = getGlobalsFromSystem(this.globals);
    if (!joltWorld) return;

    const { Jolt, bodyInterface } = joltWorld;

    for (const entity of this.queries.players.entities) {
      const bodyIdValue = num(entity.getValue(PhysicsBody, "bodyId"), -1);
      if (bodyIdValue < 0) continue;

      const bodyId = new Jolt.BodyID(bodyIdValue);
      let yaw = num(entity.getValue(Facing, "yaw"));
      const throttle = num(entity.getValue(Throttle, "amount"));

      if (throttle > 0 && camera) {
        yaw = cameraForwardYaw(camera);
        entity.setValue(Facing, "yaw", yaw);

        const speed = MAX_SPEED * throttle;
        const vel = new Jolt.Vec3(
          Math.sin(yaw) * speed,
          0,
          Math.cos(yaw) * speed,
        );
        bodyInterface.SetLinearVelocity(bodyId, vel);
        Jolt.destroy(vel);
      } else {
        const vel = bodyInterface.GetLinearVelocity(bodyId);
        const damp = Math.exp(-COAST_DAMPING * delta);
        vel.SetX(vel.GetX() * damp);
        vel.SetZ(vel.GetZ() * damp);
        bodyInterface.SetLinearVelocity(bodyId, vel);
      }

      bodyInterface.SetRotation(bodyId, yawToQuat(Jolt, yaw), Jolt.EActivation_Activate);
    }

    joltWorld.step(delta);

    for (const entity of this.queries.ships.entities) {
      const bodyIdValue = num(entity.getValue(PhysicsBody, "bodyId"), -1);
      if (bodyIdValue < 0) continue;

      const bodyId = new Jolt.BodyID(bodyIdValue);
      const pos = bodyInterface.GetPosition(bodyId);

      entity.setValue(Transform, "x", pos.GetX());
      entity.setValue(Transform, "z", pos.GetZ());

      if (entity.hasComponent(PlayerControlled)) {
        entity.setValue(Transform, "yaw", num(entity.getValue(Facing, "yaw")));
      } else {
        entity.setValue(Transform, "yaw", quatToYaw(bodyInterface.GetRotation(bodyId)));
      }
    }
  }
}
