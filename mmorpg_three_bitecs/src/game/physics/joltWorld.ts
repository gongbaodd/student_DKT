import initJolt from "jolt-physics/wasm-compat";

export type JoltModule = Awaited<ReturnType<typeof initJolt>>;

const LAYER_STATIC = 0;
const LAYER_SHIP = 1;
const NUM_LAYERS = 2;

export interface JoltWorld {
  Jolt: JoltModule;
  jolt: InstanceType<JoltModule["JoltInterface"]>;
  physicsSystem: ReturnType<
    InstanceType<JoltModule["JoltInterface"]>["GetPhysicsSystem"]
  >;
  bodyInterface: ReturnType<
    ReturnType<
      InstanceType<JoltModule["JoltInterface"]>["GetPhysicsSystem"]
    >["GetBodyInterface"]
  >;
  step: (delta: number) => void;
  dispose: () => void;
}

function setupCollisionFiltering(Jolt: JoltModule, settings: InstanceType<JoltModule["JoltSettings"]>) {
  const objectFilter = new Jolt.ObjectLayerPairFilterTable(NUM_LAYERS);
  objectFilter.EnableCollision(LAYER_STATIC, LAYER_SHIP);

  const bpStatic = new Jolt.BroadPhaseLayer(0);
  const bpShip = new Jolt.BroadPhaseLayer(1);

  const bpInterface = new Jolt.BroadPhaseLayerInterfaceTable(NUM_LAYERS, 2);
  bpInterface.MapObjectToBroadPhaseLayer(LAYER_STATIC, bpStatic);
  bpInterface.MapObjectToBroadPhaseLayer(LAYER_SHIP, bpShip);

  settings.mObjectLayerPairFilter = objectFilter;
  settings.mBroadPhaseLayerInterface = bpInterface;
  settings.mObjectVsBroadPhaseLayerFilter = new Jolt.ObjectVsBroadPhaseLayerFilterTable(
    settings.mBroadPhaseLayerInterface,
    2,
    settings.mObjectLayerPairFilter,
    NUM_LAYERS,
  );
}

function addStaticBox(
  Jolt: JoltModule,
  bodyInterface: JoltWorld["bodyInterface"],
  center: [number, number, number],
  halfExtent: [number, number, number],
) {
  const shape = new Jolt.BoxShape(
    new Jolt.Vec3(halfExtent[0], halfExtent[1], halfExtent[2]),
    0.05,
  );
  const settings = new Jolt.BodyCreationSettings(
    shape,
    new Jolt.RVec3(center[0], center[1], center[2]),
    Jolt.Quat.prototype.sIdentity(),
    Jolt.EMotionType_Static,
    LAYER_STATIC,
  );
  const body = bodyInterface.CreateBody(settings);
  Jolt.destroy(settings);
  bodyInterface.AddBody(body.GetID(), Jolt.EActivation_DontActivate);
}

function createWorldBounds(Jolt: JoltModule, bodyInterface: JoltWorld["bodyInterface"]) {
  const bound = 185;
  const wall = 2;
  const height = 20;

  addStaticBox(Jolt, bodyInterface, [0, height / 2, bound], [bound + wall, height, wall]);
  addStaticBox(Jolt, bodyInterface, [0, height / 2, -bound], [bound + wall, height, wall]);
  addStaticBox(Jolt, bodyInterface, [bound, height / 2, 0], [wall, height, bound + wall]);
  addStaticBox(Jolt, bodyInterface, [-bound, height / 2, 0], [wall, height, bound + wall]);
}

export async function createJoltWorld(): Promise<JoltWorld> {
  const Jolt = await initJolt();

  const settings = new Jolt.JoltSettings();
  setupCollisionFiltering(Jolt, settings);

  const jolt = new Jolt.JoltInterface(settings);
  Jolt.destroy(settings);

  const physicsSystem = jolt.GetPhysicsSystem();
  const bodyInterface = physicsSystem.GetBodyInterface();

  physicsSystem.SetGravity(new Jolt.Vec3(0, 0, 0));
  createWorldBounds(Jolt, bodyInterface);

  const step = (delta: number) => {
    const clamped = Math.min(delta, 1 / 30);
    const steps = clamped > 1 / 55 ? 2 : 1;
    jolt.Step(clamped, steps);
  };

  const dispose = () => {
    Jolt.destroy(jolt);
  };

  return { Jolt, jolt, physicsSystem, bodyInterface, step, dispose };
}

export const SHIP_LAYER = LAYER_SHIP;
export const WORLD_BOUNDS = 180;

export function yawToQuat(Jolt: JoltModule, yaw: number) {
  const axis = new Jolt.Vec3(0, 1, 0);
  const quat = Jolt.Quat.prototype.sRotation(axis, yaw);
  Jolt.destroy(axis);
  return quat;
}

export function quatToYaw(quat: { GetX(): number; GetY(): number; GetZ(): number; GetW(): number }) {
  return Math.atan2(
    2 * (quat.GetW() * quat.GetY() + quat.GetX() * quat.GetZ()),
    1 - 2 * (quat.GetY() * quat.GetY() + quat.GetX() * quat.GetX()),
  );
}
