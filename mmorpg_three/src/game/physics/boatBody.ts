import type { BoatKindId } from "../assets/boatCatalog";
import { BASE_BOAT_Y } from "../assets/boatCatalog";
import type { JoltWorld } from "./joltWorld";
import { SHIP_LAYER, yawToQuat } from "./joltWorld";

export interface BoatHullDef {
  halfX: number;
  halfY: number;
  halfZ: number;
  mass: number;
}

const HULL_BY_KIND: Record<BoatKindId, BoatHullDef> = {
  "boat-row-small": { halfX: 0.6, halfY: 0.25, halfZ: 1.2, mass: 40 },
  "boat-row-large": { halfX: 0.8, halfY: 0.3, halfZ: 1.6, mass: 60 },
  "ship-small": { halfX: 1.2, halfY: 0.45, halfZ: 2.4, mass: 80 },
  "ship-medium": { halfX: 1.5, halfY: 0.55, halfZ: 3.0, mass: 100 },
  "ship-large": { halfX: 1.8, halfY: 0.65, halfZ: 3.6, mass: 120 },
  "ship-pirate-small": { halfX: 1.35, halfY: 0.5, halfZ: 2.7, mass: 90 },
  "ship-pirate-medium": { halfX: 1.65, halfY: 0.6, halfZ: 3.3, mass: 110 },
  "ship-pirate-large": { halfX: 2.0, halfY: 0.7, halfZ: 4.0, mass: 140 },
};

export function getBoatHull(kind: BoatKindId): BoatHullDef {
  return HULL_BY_KIND[kind];
}

export interface CreateBoatBodyOptions {
  /** NPC hulls are static so they do not block the player via dynamic friction. */
  static?: boolean;
}

export function createBoatBody(
  world: JoltWorld,
  kind: BoatKindId,
  x: number,
  z: number,
  yaw: number,
  options: CreateBoatBodyOptions = {},
): number {
  const { Jolt, bodyInterface } = world;
  const hull = getBoatHull(kind);
  const isStatic = options.static ?? false;

  const shape = new Jolt.BoxShape(
    new Jolt.Vec3(hull.halfX, hull.halfY, hull.halfZ),
    0.05,
  );

  const settings = new Jolt.BodyCreationSettings(
    shape,
    new Jolt.RVec3(x, BASE_BOAT_Y, z),
    yawToQuat(Jolt, yaw),
    isStatic ? Jolt.EMotionType_Static : Jolt.EMotionType_Dynamic,
    SHIP_LAYER,
  );

  if (!isStatic) {
    settings.mAllowedDOFs = Jolt.EAllowedDOFs_Plane2D;
    settings.mOverrideMassProperties = Jolt.EOverrideMassProperties_MassAndInertiaProvided;
    const boxSize = new Jolt.Vec3(hull.halfX * 2, hull.halfY * 2, hull.halfZ * 2);
    settings.mMassPropertiesOverride.SetMassAndInertiaOfSolidBox(boxSize, 1);
    settings.mMassPropertiesOverride.ScaleToMass(hull.mass);
    Jolt.destroy(boxSize);
    settings.mLinearDamping = 0.5;
    settings.mAngularDamping = 1.0;
    settings.mAllowSleeping = false;
  }
  settings.mFriction = 0.4;
  settings.mRestitution = 0.05;

  const body = bodyInterface.CreateBody(settings);
  Jolt.destroy(settings);

  bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);
  return body.GetID().GetIndexAndSequenceNumber();
}
