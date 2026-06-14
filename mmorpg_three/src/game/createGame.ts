import { World } from "elics";
import {
  Clock,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { BatchedRenderer } from "three.quarks";

import {
  BoatKind,
  Bobbing,
  ExhaustSmoke,
  Facing,
  MeshRef,
  PhysicsBody,
  PlayerControlled,
  Throttle,
  Transform,
} from "./ecs/components";
import { BoatSmokeSystem } from "./ecs/systems/boatSmoke";
import { BoatPhysicsSystem } from "./ecs/systems/boatPhysics";
import { BobbingSystem } from "./ecs/systems/bobbing";
import { CameraFollowSystem } from "./ecs/systems/cameraFollow";
import {
  InitWorldSystem,
  preloadBoatTemplates,
} from "./ecs/systems/initWorld";
import { MeshSyncSystem } from "./ecs/systems/meshSync";
import { OceanShaderSystem } from "./ecs/systems/oceanShader";
import { PlayerInputSystem } from "./ecs/systems/playerInput";
import { createJoltWorld } from "./physics/joltWorld";
import {
  clearActiveGame,
  DEFAULT_CAMERA_ORBIT_PITCH,
  setActiveGame,
  type GameGlobals,
} from "./globals";

export interface GameHandle {
  renderer: WebGLRenderer;
  scene: Scene;
  world: World;
  dispose: () => void;
}

export async function createGame(canvas: HTMLCanvasElement): Promise<GameHandle> {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new Scene();
  scene.background = null;
  renderer.setClearColor(0x73b8eb, 1);

  const camera = new PerspectiveCamera(
    60,
    canvas.clientWidth / canvas.clientHeight,
    0.5,
    500,
  );
  camera.position.set(0, 10, -18);
  camera.lookAt(0, 0, 0);

  const light = new HemisphereLight(0xffffff, 0x263a59, 1.1);
  scene.add(light);

  const clock = new Clock();
  const boatTemplates = new Map();
  const keysPressed = new Set<string>();
  const cameraOrbit = {
    yaw: 0,
    pitch: DEFAULT_CAMERA_ORBIT_PITCH,
    distance: 18,
    isDragging: false,
  };

  await preloadBoatTemplates(scene, boatTemplates);
  const joltWorld = await createJoltWorld();

  const quarksRenderer = new BatchedRenderer();
  scene.add(quarksRenderer);

  const globals: GameGlobals = {
    scene,
    renderer,
    camera,
    oceanMaterial: null,
    boatTemplates,
    keysPressed,
    cameraOrbit,
    joltWorld,
    quarksRenderer,
    initialized: false,
  };

  const world = new World({
    entityCapacity: 64,
    checksOn: import.meta.env.DEV,
  });

  Object.assign(world.globals, globals);
  setActiveGame(world, globals);

  world
    .registerComponent(Transform)
    .registerComponent(Facing)
    .registerComponent(PhysicsBody)
    .registerComponent(Throttle)
    .registerComponent(MeshRef)
    .registerComponent(PlayerControlled)
    .registerComponent(Bobbing)
    .registerComponent(BoatKind)
    .registerComponent(ExhaustSmoke)
    .registerSystem(InitWorldSystem)
    .registerSystem(OceanShaderSystem, { priority: 100 })
    .registerSystem(CameraFollowSystem, { priority: 200 })
    .registerSystem(PlayerInputSystem, { priority: 300 })
    .registerSystem(BoatPhysicsSystem, { priority: 400 })
    .registerSystem(BobbingSystem, { priority: 500 })
    .registerSystem(MeshSyncSystem, { priority: 600 })
    .registerSystem(BoatSmokeSystem, { priority: 700 });

  let frameId = 0;
  let elapsed = 0;

  const tick = () => {
    frameId = requestAnimationFrame(tick);
    const delta = clock.getDelta();
    elapsed += delta;
    world.update(delta, elapsed * 1000);
    renderer.render(scene, camera);
  };
  tick();

  const onResize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  window.addEventListener("resize", onResize);

  return {
    renderer,
    scene,
    world,
    dispose: () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      keysPressed.clear();
      clearActiveGame();
      joltWorld.dispose();

      scene.traverse((object) => {
        if ("geometry" in object) {
          const mesh = object as { geometry?: { dispose(): void } };
          mesh.geometry?.dispose();
        }
        if ("material" in object) {
          const mesh = object as { material?: { dispose(): void } | { dispose(): void }[] };
          const { material } = mesh;
          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose());
          } else {
            material?.dispose();
          }
        }
      });

      renderer.dispose();
      boatTemplates.clear();
      globals.joltWorld = null;
      globals.oceanMaterial = null;
      globals.quarksRenderer = null;
      globals.initialized = false;
    },
  };
}
