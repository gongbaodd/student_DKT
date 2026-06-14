import { createComponent, Types } from "elics";

export const Transform = createComponent("Transform", {
  x: { type: Types.Float32, default: 0 },
  y: { type: Types.Float32, default: 0 },
  z: { type: Types.Float32, default: 0 },
  yaw: { type: Types.Float32, default: 0 },
  roll: { type: Types.Float32, default: 0 },
});

export const Throttle = createComponent("Throttle", {
  amount: { type: Types.Float32, default: 0 },
});

export const PhysicsBody = createComponent("PhysicsBody", {
  bodyId: { type: Types.Int32, default: -1 },
});

export const Facing = createComponent("Facing", {
  yaw: { type: Types.Float32, default: 0 },
});

export const MeshRef = createComponent("MeshRef", {
  object3D: { type: Types.Object, default: null },
});

export const PlayerControlled = createComponent("PlayerControlled", {});

export const Bobbing = createComponent("Bobbing", {
  baseY: { type: Types.Float32, default: 0 },
  amplitude: { type: Types.Float32, default: 0.15 },
  phase: { type: Types.Float32, default: 0 },
  rollAmount: { type: Types.Float32, default: 0.06 },
});

export const BoatKind = createComponent("BoatKind", {
  kind: { type: Types.String, default: "" },
});

export const ExhaustSmoke = createComponent("ExhaustSmoke", {
  effectRoot: { type: Types.Object, default: null },
});
