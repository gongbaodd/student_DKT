import type { Object3D } from "three";

import type { BoatKindId } from "../assets/boatCatalog";

export const Transform = {
  x: [] as number[],
  y: [] as number[],
  z: [] as number[],
  yaw: [] as number[],
  roll: [] as number[],
};

export const Throttle = {
  amount: [] as number[],
};

export const PhysicsBody = {
  bodyId: [] as number[],
};

export const Facing = {
  yaw: [] as number[],
};

export const MeshRef = {
  object3D: [] as Object3D[],
};

export const PlayerControlled = {};

export const Npc = {};

export const Bobbing = {
  baseY: [] as number[],
  amplitude: [] as number[],
  phase: [] as number[],
  rollAmount: [] as number[],
};

export const ExhaustSmoke = {
  effectRoot: [] as Object3D[],
};

/** Boat kind stored outside ECS (only set at spawn, never queried by systems). */
export const boatKindByEid = new Map<number, BoatKindId>();

export const ALL_COMPONENTS = [
  Transform,
  Throttle,
  PhysicsBody,
  Facing,
  MeshRef,
  PlayerControlled,
  Npc,
  Bobbing,
  ExhaustSmoke,
] as const;
