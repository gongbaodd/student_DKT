import type { Object3D } from "three";

import type { GameGlobals, NpcPickEntry } from "../globals";

export function registerNpcPickTarget(
  globals: GameGlobals,
  root: Object3D,
  entityIndex: number,
): void {
  if (globals.npcPickTargets.some((entry) => entry.root === root)) return;
  globals.npcPickTargets.push({ root, entityIndex });
}

export function unregisterNpcPickTarget(globals: GameGlobals, root: Object3D): void {
  const index = globals.npcPickTargets.findIndex((entry) => entry.root === root);
  if (index >= 0) {
    globals.npcPickTargets.splice(index, 1);
  }
}

export type { NpcPickEntry };
