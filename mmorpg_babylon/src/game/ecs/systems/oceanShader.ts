import { system, System } from "@lastolivegames/becsy";

import { gameContext } from "../../gameContext";

@system
export class OceanShaderSystem extends System {
  private elapsed = 0;

  execute(): void {
    const material = gameContext.oceanMaterial;
    if (!material) return;

    this.elapsed += this.delta;
    material.setFloat("time", this.elapsed);
  }
}
