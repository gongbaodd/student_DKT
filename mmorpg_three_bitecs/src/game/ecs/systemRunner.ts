import type { World } from "bitecs";

import type { GameGlobals } from "../globals";

export interface GameSystem {
  priority: number;
  init?: (world: World, ctx: GameGlobals) => void;
  update: (world: World, ctx: GameGlobals, delta: number) => void;
}

export function initSystems(
  systems: GameSystem[],
  world: World,
  ctx: GameGlobals,
): void {
  for (const system of systems) {
    system.init?.(world, ctx);
  }
}

export function runSystems(
  systems: GameSystem[],
  world: World,
  ctx: GameGlobals,
  delta: number,
): void {
  for (const system of systems) {
    system.update(world, ctx, delta);
  }
}
