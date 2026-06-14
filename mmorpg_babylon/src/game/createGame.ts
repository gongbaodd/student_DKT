import {
  Color3,
  Color4,
  Engine,
  HemisphericLight,
  Scene,
  UniversalCamera,
  Vector3,
} from "@babylonjs/core";
import type { Observer } from "@babylonjs/core/Misc/observable";
import { World } from "@lastolivegames/becsy";

import { gameContext } from "./gameContext";
import {
  BoatKind,
  Bobbing,
  Facing,
  MeshRef,
  PlayerControlled,
  Transform,
  Velocity,
} from "./ecs/components";
import { BobbingSystem } from "./ecs/systems/bobbing";
import { CameraFollowSystem } from "./ecs/systems/cameraFollow";
import { InitWorldSystem } from "./ecs/systems/initWorld";
import { MeshSyncSystem } from "./ecs/systems/meshSync";
import { MovementSystem } from "./ecs/systems/movement";
import { OceanShaderSystem } from "./ecs/systems/oceanShader";
import { PlayerInputSystem } from "./ecs/systems/playerInput";

export interface GameHandle {
  engine: Engine;
  scene: Scene;
  world: World;
  dispose: () => Promise<void>;
}

let worldTerminateLock: Promise<void> = Promise.resolve();

async function terminateActiveWorld(): Promise<void> {
  if (!gameContext.world) return;
  const world = gameContext.world;
  gameContext.world = null;
  await world.terminate();
}

export async function createGame(canvas: HTMLCanvasElement): Promise<GameHandle> {
  await worldTerminateLock;
  await terminateActiveWorld();

  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
  });

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.45, 0.72, 0.92, 1);

  const camera = new UniversalCamera(
    "followCam",
    new Vector3(0, 10, -18),
    scene,
  );
  camera.setTarget(Vector3.Zero());
  camera.minZ = 0.5;
  camera.maxZ = 500;

  const light = new HemisphericLight("sun", new Vector3(0.3, 1, 0.2), scene);
  light.intensity = 1.1;
  light.groundColor = new Color3(0.15, 0.25, 0.35);

  gameContext.scene = scene;
  gameContext.engine = engine;
  gameContext.camera = camera;

  const world = await World.create({
    defs: [
      Transform,
      Velocity,
      Facing,
      MeshRef,
      PlayerControlled,
      Bobbing,
      BoatKind,
      InitWorldSystem,
      PlayerInputSystem,
      MovementSystem,
      BobbingSystem,
      MeshSyncSystem,
      CameraFollowSystem,
      OceanShaderSystem,
    ],
    maxEntities: 64,
  });

  gameContext.world = world;

  const renderObserver: Observer<Scene> = scene.onBeforeRenderObservable.add(
    () => {
      void world.execute(undefined, engine.getDeltaTime() / 1000);
    },
  );

  engine.runRenderLoop(() => {
    scene.render();
  });

  const onResize = () => engine.resize();
  window.addEventListener("resize", onResize);

  return {
    engine,
    scene,
    world,
    dispose: async () => {
      window.removeEventListener("resize", onResize);
      scene.onBeforeRenderObservable.remove(renderObserver);
      engine.stopRenderLoop();

      const terminatePromise = (async () => {
        if (gameContext.world === world) {
          gameContext.world = null;
        }
        await world.terminate();
        scene.dispose();
        engine.dispose();
        gameContext.scene = null;
        gameContext.engine = null;
        gameContext.camera = null;
        gameContext.oceanMaterial = null;
        gameContext.boatTemplates.clear();
        gameContext.initialized = false;
      })();

      worldTerminateLock = terminatePromise;
      await terminatePromise;
      worldTerminateLock = Promise.resolve();
    },
  };
}
