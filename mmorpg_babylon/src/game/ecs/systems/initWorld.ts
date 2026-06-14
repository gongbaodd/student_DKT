import { system, System } from "@lastolivegames/becsy";

import { BOAT_DEFS, BASE_BOAT_Y, buildSpawnLayout } from "../../assets/boatCatalog";
import { cloneBoat, loadBoatTemplate } from "../../babylon/loadBoat";
import { createOcean } from "../../babylon/createOcean";
import { gameContext } from "../../gameContext";
import {
  BoatKind,
  Bobbing,
  Facing,
  MeshRef,
  PlayerControlled,
  Transform,
  Velocity,
} from "../components";

@system
export class InitWorldSystem extends System {
  private readonly _spawnEntitlements = this.query((q) =>
    q.using(
      Transform,
      MeshRef,
      BoatKind,
      Bobbing,
      PlayerControlled,
      Facing,
      Velocity,
    ).write,
  );

  override async prepare(): Promise<void> {
    const scene = gameContext.scene;
    if (!scene) {
      throw new Error("InitWorldSystem: scene not set");
    }

    gameContext.oceanMaterial = createOcean(scene);

    await Promise.all(
      BOAT_DEFS.map(async (def) => {
        const template = await loadBoatTemplate(scene, def.id, def.scale);
        gameContext.boatTemplates.set(def.id, template);
      }),
    );
  }

  override initialize(): void {
    void this._spawnEntitlements;

    const spawns = buildSpawnLayout();

    for (const spawn of spawns) {
      const template = gameContext.boatTemplates.get(spawn.id);
      if (!template) continue;

      const node = cloneBoat(template, `boat-${spawn.id}-${spawn.isPlayer ? "player" : "npc"}`);
      node.position.x = spawn.x;
      node.position.y = BASE_BOAT_Y;
      node.position.z = spawn.z;
      node.rotation.y = spawn.yaw;

      const components: Parameters<typeof this.createEntity>[0][] = [
        Transform,
        {
          x: spawn.x,
          y: BASE_BOAT_Y,
          z: spawn.z,
          yaw: spawn.yaw,
          roll: 0,
        },
        MeshRef,
        { node },
        BoatKind,
        { kind: spawn.id },
        Bobbing,
        {
          baseY: BASE_BOAT_Y,
          amplitude: spawn.isPlayer ? 0.08 : 0.15,
          phase: Math.random() * Math.PI * 2,
          rollAmount: spawn.isPlayer ? 0.03 : 0.06,
        },
      ];

      if (spawn.isPlayer) {
        components.push(
          PlayerControlled,
          Facing,
          { yaw: spawn.yaw },
          Velocity,
          { vx: 0, vz: 0 },
        );
      }

      this.createEntity(...components);
    }

    gameContext.initialized = true;
  }
}
