import { hasComponent, query } from "bitecs";
import type { World } from "bitecs";

import { num } from "../../globals";
import type { GameGlobals } from "../../globals";
import { quatToYaw, WORLD_BOUNDS, yawToQuat } from "../../physics/joltWorld";
import {
  Facing,
  PhysicsBody,
  PlayerControlled,
  Throttle,
  Transform,
} from "../components";
import type { GameSystem } from "../systemRunner";

const MAX_SPEED = 12;
const COAST_DAMPING = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function physicsDelta(delta: number): number {
  return Math.min(delta, 1 / 30);
}

export function createBoatPhysicsSystem(): GameSystem {
  return {
    priority: 400,
    update(world: World, ctx: GameGlobals, delta: number): void {
      const { joltWorld, cameraOrbit } = ctx;
      if (!joltWorld) return;

      const { Jolt, bodyInterface } = joltWorld;
      const stepDelta = physicsDelta(delta);
      const zeroVel = new Jolt.Vec3(0, 0, 0);

      for (const eid of query(world, [PlayerControlled, PhysicsBody, Facing, Throttle, Transform])) {
        const bodyIdValue = num(PhysicsBody.bodyId[eid], -1);
        if (bodyIdValue < 0) continue;

        const bodyId = new Jolt.BodyID(bodyIdValue);
        let yaw = num(Facing.yaw[eid]);
        const throttle = num(Throttle.amount[eid]);

        if (throttle > 0) {
          yaw = cameraOrbit.yaw;
          Facing.yaw[eid] = yaw;

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

      for (const eid of query(world, [PhysicsBody, Transform])) {
        const bodyIdValue = num(PhysicsBody.bodyId[eid], -1);
        if (bodyIdValue < 0) continue;

        const bodyId = new Jolt.BodyID(bodyIdValue);
        const pos = bodyInterface.GetPosition(bodyId);

        Transform.x[eid] = pos.GetX();
        Transform.z[eid] = pos.GetZ();

        if (hasComponent(world, eid, PlayerControlled)) {
          Transform.yaw[eid] = num(Facing.yaw[eid]);
        } else {
          Transform.yaw[eid] = quatToYaw(bodyInterface.GetRotation(bodyId));
        }
      }
    },
  };
}
