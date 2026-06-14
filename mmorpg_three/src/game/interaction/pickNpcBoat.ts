import type { Camera, Object3D, Vector3 } from "three";
import { Box3, Vector3 as V3 } from "three";

import type { NpcPickEntry } from "../globals";

export interface NpcPickResult {
  entityIndex: number;
  worldPosition: Vector3;
}

export interface NpcPickCandidate {
  entityIndex: number;
  name: string;
  screenX: number;
  screenY: number;
  distPx: number;
  behindCamera: boolean;
}

export interface NpcPickReport {
  pick: NpcPickResult | null;
  pointerX: number;
  pointerY: number;
  maxDistancePx: number;
  targetCount: number;
  candidates: NpcPickCandidate[];
}

const projected = new V3();
const bbox = new Box3();

function getPickWorldCenter(root: Object3D): V3 {
  root.updateMatrixWorld(true);
  bbox.setFromObject(root);
  if (bbox.isEmpty()) {
    return root.getWorldPosition(new V3());
  }
  return bbox.getCenter(new V3());
}

function projectWorldToScreen(
  camera: Camera,
  canvas: HTMLCanvasElement,
  world: V3,
): { screenX: number; screenY: number; behindCamera: boolean } {
  projected.copy(world).project(camera);
  const rect = canvas.getBoundingClientRect();
  return {
    screenX: rect.left + ((projected.x + 1) / 2) * rect.width,
    screenY: rect.top + ((1 - projected.y) / 2) * rect.height,
    behindCamera: projected.z > 1,
  };
}

export function buildNpcPickReport(
  camera: Camera,
  canvas: HTMLCanvasElement,
  targets: readonly NpcPickEntry[],
  clientX: number,
  clientY: number,
  maxDistancePx = 72,
): NpcPickReport {
  camera.updateMatrixWorld(true);

  const candidates: NpcPickCandidate[] = [];

  for (const { root, entityIndex } of targets) {
    const center = getPickWorldCenter(root);
    const { screenX, screenY, behindCamera } = projectWorldToScreen(camera, canvas, center);
    const distPx = Math.hypot(clientX - screenX, clientY - screenY);

    candidates.push({
      entityIndex,
      name: root.name,
      screenX,
      screenY,
      distPx,
      behindCamera,
    });
  }

  candidates.sort((a, b) => a.distPx - b.distPx);

  let pick: NpcPickResult | null = null;
  for (const candidate of candidates) {
    if (candidate.behindCamera) continue;
    if (candidate.distPx <= maxDistancePx) {
      const center = getPickWorldCenter(
        targets.find((t) => t.entityIndex === candidate.entityIndex)!.root,
      );
      pick = { entityIndex: candidate.entityIndex, worldPosition: center };
      break;
    }
  }

  return {
    pick,
    pointerX: clientX,
    pointerY: clientY,
    maxDistancePx,
    targetCount: targets.length,
    candidates,
  };
}

/** Live projected positions for debug overlay (no pointer). */
export function buildNpcLiveCandidates(
  camera: Camera,
  canvas: HTMLCanvasElement,
  targets: readonly NpcPickEntry[],
): NpcPickCandidate[] {
  camera.updateMatrixWorld(true);

  return targets.map(({ root, entityIndex }) => {
    const center = getPickWorldCenter(root);
    const { screenX, screenY, behindCamera } = projectWorldToScreen(camera, canvas, center);
    return {
      entityIndex,
      name: root.name,
      screenX,
      screenY,
      distPx: 0,
      behindCamera,
    };
  });
}

/** Pick the NPC whose projected screen position is closest to the pointer. */
export function pickNpcBoatAtScreen(
  camera: Camera,
  canvas: HTMLCanvasElement,
  targets: readonly NpcPickEntry[],
  clientX: number,
  clientY: number,
  maxDistancePx = 72,
): NpcPickResult | null {
  return buildNpcPickReport(
    camera,
    canvas,
    targets,
    clientX,
    clientY,
    maxDistancePx,
  ).pick;
}
