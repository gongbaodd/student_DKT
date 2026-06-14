import type { Camera, Object3D, Vector3 } from "three";
import { Vector3 as V3 } from "three";

export interface NpcPickEntry {
  root: Object3D;
  entityIndex: number;
}

export interface NpcPickResult {
  entityIndex: number;
  worldPosition: Vector3;
}

const worldPos = new V3();
const projected = new V3();

/** Pick the NPC whose projected screen position is closest to the pointer. */
export function pickNpcBoatAtScreen(
  camera: Camera,
  canvas: HTMLCanvasElement,
  targets: readonly NpcPickEntry[],
  clientX: number,
  clientY: number,
  maxDistancePx = 72,
): NpcPickResult | null {
  if (targets.length === 0) return null;

  camera.updateMatrixWorld(true);

  const rect = canvas.getBoundingClientRect();
  let best: NpcPickResult | null = null;
  let bestDist = maxDistancePx;

  for (const { root, entityIndex } of targets) {
    root.updateMatrixWorld(true);
    root.getWorldPosition(worldPos);

    projected.copy(worldPos).project(camera);
    if (projected.z > 1) continue;

    const screenX = rect.left + ((projected.x + 1) / 2) * rect.width;
    const screenY = rect.top + ((1 - projected.y) / 2) * rect.height;
    const dist = Math.hypot(clientX - screenX, clientY - screenY);

    if (dist <= bestDist) {
      bestDist = dist;
      best = { entityIndex, worldPosition: worldPos.clone() };
    }
  }

  return best;
}
