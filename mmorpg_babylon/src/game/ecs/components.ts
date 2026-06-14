import { component, field, Type } from "@lastolivegames/becsy";

@component
export class Transform {
  @field(Type.float32) declare x: number;
  @field(Type.float32) declare y: number;
  @field(Type.float32) declare z: number;
  @field(Type.float32) declare yaw: number;
  @field(Type.float32) declare roll: number;
}

@component
export class Velocity {
  @field(Type.float32) declare vx: number;
  @field(Type.float32) declare vz: number;
}

@component
export class Facing {
  @field(Type.float32) declare yaw: number;
}

@component
export class MeshRef {
  @field(Type.weakObject) declare node: TransformNodeRef | undefined;
}

@component
export class PlayerControlled {}

@component
export class Bobbing {
  @field(Type.float32) declare baseY: number;
  @field(Type.float32) declare amplitude: number;
  @field(Type.float32) declare phase: number;
  @field(Type.float32) declare rollAmount: number;
}

@component
export class BoatKind {
  @field(Type.dynamicString(64)) declare kind: string;
}

/** Weak reference target for Kenney GLB root nodes. */
export interface TransformNodeRef {
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scaling: { x: number; y: number; z: number };
  setEnabled(enabled: boolean): void;
}
