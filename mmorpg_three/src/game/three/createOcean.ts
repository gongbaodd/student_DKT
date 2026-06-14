import {
  DoubleSide,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from "three";
import type { Scene } from "three";

import {
  cartoonOceanFragmentShader,
  cartoonOceanVertexShader,
} from "./cartoonOceanShader";

export function createOcean(scene: Scene): ShaderMaterial {
  const geometry = new PlaneGeometry(400, 400, 128, 128);
  geometry.rotateX(-Math.PI / 2);

  const material = new ShaderMaterial({
    vertexShader: cartoonOceanVertexShader,
    fragmentShader: cartoonOceanFragmentShader,
    uniforms: {
      time: { value: 0 },
      waveAmplitude: { value: 0.35 },
      shallowColor: { value: new Vector3(0.2, 0.75, 0.85) },
      deepColor: { value: new Vector3(0.05, 0.25, 0.55) },
    },
    side: DoubleSide,
  });

  const ocean = new Mesh(geometry, material);
  ocean.name = "ocean";
  ocean.renderOrder = 0;
  ocean.raycast = () => {};
  scene.add(ocean);

  return material;
}
