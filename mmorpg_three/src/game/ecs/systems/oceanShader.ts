import { createSystem } from "elics";

import { getGlobalsFromSystem } from "../../globals";

export class OceanShaderSystem extends createSystem({}) {
  private elapsed = 0;

  update(delta: number): void {
    const material = getGlobalsFromSystem(this.globals).oceanMaterial;
    if (!material) return;

    this.elapsed += delta;
    material.uniforms.time.value = this.elapsed;
  }
}
