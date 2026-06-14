import { createComponent, Types } from "elics";

export const Transform = createComponent("Transform", {
  x: { type: Types.Float32, default: 0 },
  y: { type: Types.Float32, default: 0 },
  z: { type: Types.Float32, default: 0 },
  yaw: { type: Types.Float32, default: 0 },
  roll: { type: Types.Float32, default: 0 },
});

export const Velocity = createComponent("Velocity", {
  vx: { type: Types.Float32, default: 0 },
  vz: { type: Types.Float32, default: 0 },
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
