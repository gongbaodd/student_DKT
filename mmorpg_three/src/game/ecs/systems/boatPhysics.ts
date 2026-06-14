import { createSystem } from "elics";

import { getGlobalsFromSystem, num } from "../../globals";
import { quatToYaw, WORLD_BOUNDS, yawToQuat } from "../../physics/joltWorld";
import {
  Facing,
  PhysicsBody,
  PlayerControlled,
  Throttle,
  Transform,
} from "../components";

const MAX_SPEED = 12;
const COAST_DAMPING = 4;

const queries = {
  ships: { required: [PhysicsBody, Transform] },
  players: { required: [PlayerControlled, PhysicsBody, Facing, Throttle, Transform] },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function physicsDelta(delta: number): number {
  return Math.min(delta, 1 / 30);
}

export class BoatPhysicsSystem extends createSystem(queries) {
  update(delta: number): void {
    const { joltWorld, cameraOrbit } = getGlobalsFromSystem(this.globals);
    if (!joltWorld) return;

    const { Jolt, bodyInterface } = joltWorld;
    const stepDelta = physicsDelta(delta);
    const zeroVel = new Jolt.Vec3(0, 0, 0);

    for (const entity of this.queries.players.entities) {
      const bodyIdValue = num(entity.getValue(PhysicsBody, "bodyId"), -1);
      if (bodyIdValue < 0) continue;

      const bodyId = new Jolt.BodyID(bodyIdValue);
      let yaw = num(entity.getValue(Facing, "yaw"));
      const throttle = num(entity.getValue(Throttle, "amount"));

      if (throttle > 0) {
        yaw = cameraOrbit.yaw;
        entity.setValue(Facing, "yaw", yaw);

        if (bodyInterface.GetMotionType(bodyId) !== Jolt.EMotionType_Kinematic) {
          bodyInterface.SetMotionType(bodyId, Jolt.EMotionType_Kinematic, Jolt.EActivation_Activate);
          bodyInterface.SetLinearVelocity(bodyId, zeroVel);
          bodyInterface.SetAngularVelocity(bodyId, zeroVel);
        }

        const moveQuat = yawToQuat(Jolt, yaw);
        const speed = MAX_SPEED * throttle;
        const pos = bodyInterface.GetPosition(bodyId);
        const nextPos = new Jolt.RVec3(
          clamp(pos.GetX() + Math.sin(yaw) * speed * stepDelta, -WORLD_BOUNDS, WORLD_BOUNDS),
          pos.GetY(),
          clamp(pos.GetZ() + Math.cos(yaw) * speed * stepDelta, -WORLD_BOUNDS, WORLD_BOUNDS),
        );
        bodyInterface.SetPosition(bodyId, nextPos, Jolt.EActivation_Activate);
        bodyInterface.SetRotation(bodyId, moveQuat, Jolt.EActivation_Activate);
        bodyInterface.SetLinearVelocity(bodyId, zeroVel);
        bodyInterface.SetAngularVelocity(bodyId, zeroVel);
        Jolt.destroy(nextPos);
        Jolt.destroy(moveQuat);
      } else {
        if (bodyInterface.GetMotionType(bodyId) !== Jolt.EMotionType_Dynamic) {
          bodyInterface.SetMotionType(bodyId, Jolt.EMotionType_Dynamic, Jolt.EActivation_Activate);
          const coastVel = new Jolt.Vec3(
            Math.sin(yaw) * MAX_SPEED,
            0,
            Math.cos(yaw) * MAX_SPEED,
          );
          bodyInterface.SetLinearVelocity(bodyId, coastVel);
          Jolt.destroy(coastVel);
        }

        const vel = bodyInterface.GetLinearVelocity(bodyId);
        const damp = Math.exp(-COAST_DAMPING * stepDelta);
        vel.SetX(vel.GetX() * damp);
        vel.SetZ(vel.GetZ() * damp);
        bodyInterface.SetLinearVelocity(bodyId, vel);

        const quat = yawToQuat(Jolt, yaw);
        bodyInterface.SetRotation(bodyId, quat, Jolt.EActivation_Activate);
        bodyInterface.SetAngularVelocity(bodyId, zeroVel);
        Jolt.destroy(quat);
      }
    }

    Jolt.destroy(zeroVel);

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
