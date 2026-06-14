import { Color3, MeshBuilder, ShaderMaterial, Vector3 } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";

import { registerCartoonOceanShaders } from "./cartoonOceanShader";

export function createOcean(scene: Scene): ShaderMaterial {
  registerCartoonOceanShaders();

  const ocean = MeshBuilder.CreateGround(
    "ocean",
    { width: 400, height: 400, subdivisions: 128 },
    scene,
  );
  ocean.position = Vector3.Zero();
  ocean.isPickable = false;

  const material = new ShaderMaterial(
    "cartoonOcean",
    scene,
    { vertex: "cartoonOcean", fragment: "cartoonOcean" },
    {
      attributes: ["position", "normal", "uv"],
      uniforms: [
        "world",
        "worldViewProjection",
        "time",
        "waveAmplitude",
        "shallowColor",
        "deepColor",
      ],
    },
  );

  material.backFaceCulling = false;
  material.setFloat("time", 0);
  material.setFloat("waveAmplitude", 0.35);
  material.setColor3("shallowColor", new Color3(0.2, 0.75, 0.85));
  material.setColor3("deepColor", new Color3(0.05, 0.25, 0.55));

  ocean.material = material;
  ocean.renderingGroupId = 0;

  return material;
}
