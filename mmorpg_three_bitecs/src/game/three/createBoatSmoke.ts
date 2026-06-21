import type { Object3D } from "three";
import { QuarksLoader, QuarksUtil } from "three.quarks";

import type { BoatKindId } from "../assets/boatCatalog";
import flamethrowerJson from "../assets/Cartoon Blue Flamethrower.json";
import { getBoatHull } from "../physics/boatBody";

let cachedTemplate: Object3D | null = null;
const loader = new QuarksLoader();

function getExhaustTemplate(): Object3D {
  if (!cachedTemplate) {
    cachedTemplate = loader.parse(flamethrowerJson);
  }
  return cachedTemplate;
}

export function createBoatSmoke(kind: BoatKindId): Object3D {
  const hull = getBoatHull(kind);
  const sternZ = -hull.halfZ * 0.92;
  const emitY = hull.halfY * 0.35;
  const scale = hull.halfZ / 3;

  const effect = getExhaustTemplate().clone(true);
  loader.linkReference(effect);
  effect.position.set(0, emitY, sternZ);
  effect.rotation.set(0, Math.PI, 0);
  effect.scale.setScalar(scale);
  QuarksUtil.stop(effect);
  effect.visible = false;

  return effect;
}
