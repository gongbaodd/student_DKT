import { World } from "elics";
import {
  Clock,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";

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

  const globals: GameGlobals = {
    scene,
    renderer,
    camera,
    oceanMaterial: null,
    boatTemplates,
    keysPressed,
    cameraOrbit,
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
      globals.oceanMaterial = null;
      globals.initialized = false;
    },
  };
}
