import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";

let loadersRegistered = false;

function ensureLoaders(): void {
  if (!loadersRegistered) {
    registerBuiltInLoaders();
    loadersRegistered = true;
  }
}

export async function loadBoatTemplate(
  scene: Scene,
  id: string,
  scale: number,
): Promise<TransformNode> {
  ensureLoaders();

  const container = await LoadAssetContainerAsync(
    `/assets/models/${id}.glb`,
    scene,
  );
  container.addAllToScene();

  const root = container.rootNodes[0] as TransformNode;
  root.name = `template-${id}`;
  root.scaling.scaleInPlace(scale);
  root.setEnabled(false);
  return root;
}

export function cloneBoat(template: TransformNode, name: string): TransformNode {
  const clone = template.clone(name, null) as TransformNode;
  clone.setEnabled(true);
  return clone;
}
