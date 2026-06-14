export type BoatKindId =
  | "boat-row-small"
  | "boat-row-large"
  | "ship-small"
  | "ship-medium"
  | "ship-large"
  | "ship-pirate-small"
  | "ship-pirate-medium"
  | "ship-pirate-large";

export interface BoatDef {
  id: BoatKindId;
  scale: number;
}

export interface BoatSpawn {
  id: BoatKindId;
  x: number;
  z: number;
  yaw: number;
  isPlayer: boolean;
}

export const BOAT_DEFS: BoatDef[] = [
  { id: "boat-row-small", scale: 2.5 },
  { id: "boat-row-large", scale: 3.0 },
  { id: "ship-small", scale: 4.0 },
  { id: "ship-medium", scale: 5.0 },
  { id: "ship-large", scale: 6.0 },
  { id: "ship-pirate-small", scale: 4.5 },
  { id: "ship-pirate-medium", scale: 5.5 },
  { id: "ship-pirate-large", scale: 6.5 },
];

const RING_RADIUS = 45;

export function buildSpawnLayout(): BoatSpawn[] {
  const playerId: BoatKindId = "ship-pirate-medium";
  const others = BOAT_DEFS.filter((b) => b.id !== playerId);
  const spawns: BoatSpawn[] = [
    { id: playerId, x: 0, z: 0, yaw: 0, isPlayer: true },
  ];

  others.forEach((boat, index) => {
    const angle = (index / others.length) * Math.PI * 2;
    spawns.push({
      id: boat.id,
      x: Math.sin(angle) * RING_RADIUS,
      z: Math.cos(angle) * RING_RADIUS,
      yaw: angle + Math.PI,
      isPlayer: false,
    });
  });

  return spawns;
}

export const BASE_BOAT_Y = 0.2;
