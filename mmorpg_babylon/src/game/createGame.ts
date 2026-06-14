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
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { World } from "elics";

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
import {
  InitWorldSystem,
  preloadBoatTemplates,
} from "./ecs/systems/initWorld";
import { MeshSyncSystem } from "./ecs/systems/meshSync";
import { MovementSystem } from "./ecs/systems/movement";
import { OceanShaderSystem } from "./ecs/systems/oceanShader";
import { PlayerInputSystem } from "./ecs/systems/playerInput";
import {
  clearActiveGame,
  setActiveGame,
  type GameGlobals,
} from "./globals";

export interface GameHandle {
  engine: Engine;
  scene: Scene;
  world: World;
  dispose: () => void;
}

export async function createGame(canvas: HTMLCanvasElement): Promise<GameHandle> {
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

  const boatTemplates = new Map<string, TransformNode>();
  const keysPressed = new Set<string>();

  const globals: GameGlobals = {
    scene,
    engine,
    camera,
    oceanMaterial: null,
    boatTemplates,
    keysPressed,
    initialized: false,
  };

  await preloadBoatTemplates(scene, boatTemplates);

  const world = new World({
    entityCapacity: 64,
    checksOn: import.meta.env.DEV,
  });

  Object.assign(world.globals, globals);
  setActiveGame(world, globals);

  world
    .registerComponent(Transform)
    .registerComponent(Velocity)
    .registerComponent(Facing)
    .registerComponent(MeshRef)
    .registerComponent(PlayerControlled)
    .registerComponent(Bobbing)
    .registerComponent(BoatKind)
    .registerSystem(InitWorldSystem)
    .registerSystem(PlayerInputSystem, { priority: 600 })
    .registerSystem(MovementSystem, { priority: 500 })
    .registerSystem(BobbingSystem, { priority: 400 })
    .registerSystem(MeshSyncSystem, { priority: 300 })
    .registerSystem(CameraFollowSystem, { priority: 200 })
    .registerSystem(OceanShaderSystem, { priority: 100 });

  let elapsed = 0;

  const renderObserver: Observer<Scene> = scene.onBeforeRenderObservable.add(
    () => {
      const delta = engine.getDeltaTime() / 1000;
      elapsed += delta;
      world.update(delta, elapsed * 1000);
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
    dispose: () => {
      window.removeEventListener("resize", onResize);
      scene.onBeforeRenderObservable.remove(renderObserver);
      engine.stopRenderLoop();
      clearActiveGame();
      keysPressed.clear();
      boatTemplates.clear();
      globals.oceanMaterial = null;
      globals.initialized = false;
      scene.dispose();
      engine.dispose();
    },
  };
}
