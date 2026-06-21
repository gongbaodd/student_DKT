import type { Object3D, Scene } from "three";
import type { BatchedRenderer } from "three.quarks";
import { QuarksLoader, QuarksUtil } from "three.quarks";

import bangJson from "../assets/Cartoon Bang.json";

let cachedTemplate: Object3D | null = null;
const loader = new QuarksLoader();

function getBangTemplate(): Object3D {
  if (!cachedTemplate) {
    cachedTemplate = loader.parse(bangJson);
  }
  return cachedTemplate;
}

export function spawnBangEffect(
  scene: Scene,
  x: number,
  y: number,
  z: number,
  quarksRenderer: BatchedRenderer | null,
): Object3D {
  const effect = getBangTemplate().clone(true);
  loader.linkReference(effect);
  effect.position.set(x, y + 1.5, z);
  effect.scale.setScalar(2.5);
  scene.add(effect);

  if (quarksRenderer) {
    QuarksUtil.addToBatchRenderer(effect, quarksRenderer);
  }

  QuarksUtil.play(effect);
  return effect;
}
