import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Object3D } from "three";
import type { Scene } from "three";

const loader = new GLTFLoader();

export async function loadBoatTemplate(
  scene: Scene,
  id: string,
  scale: number,
): Promise<Object3D> {
  const gltf = await loader.loadAsync(`/assets/models/${id}.glb`);
  const root = gltf.scene;
  root.name = `template-${id}`;
  root.scale.setScalar(scale);
  root.visible = false;
  scene.add(root);
  return root;
}

export function cloneBoat(template: Object3D, name: string): Object3D {
  const clone = template.clone(true);
  clone.name = name;
  clone.visible = true;
  return clone;
}
