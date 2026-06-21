import { createWorld, registerComponents } from "bitecs";
import type { World } from "bitecs";
import {
  Clock,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { BatchedRenderer } from "three.quarks";

import { ALL_COMPONENTS } from "./ecs/components";
import { createBoatSmokeSystem } from "./ecs/systems/boatSmoke";
import { createBoatPhysicsSystem } from "./ecs/systems/boatPhysics";
import { createBobbingSystem } from "./ecs/systems/bobbing";
import { createCameraFollowSystem } from "./ecs/systems/cameraFollow";
import {
  initWorld,
  preloadBoatTemplates,
} from "./ecs/systems/initWorld";
import { createMeshSyncSystem } from "./ecs/systems/meshSync";
import { createNpcInteractionSystem } from "./ecs/systems/npcInteraction";
import { createOceanShaderSystem } from "./ecs/systems/oceanShader";
import { createPlayerInputSystem } from "./ecs/systems/playerInput";
import { initSystems, runSystems, type GameSystem } from "./ecs/systemRunner";
import { buildNpcPickReport } from "./interaction/pickNpcBoat";
import { createJoltWorld } from "./physics/joltWorld";
import {
  clearActiveGame,
  DEFAULT_CAMERA_ORBIT_PITCH,
  getActiveGlobals,
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

  const world = createWorld();
  registerComponents(world, [...ALL_COMPONENTS]);

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
    npcPickTargets: [],
  };

  setActiveGame(world, globals);

  if (import.meta.env.DEV) {
    (window as Window & {
      __mmorpgDebug?: {
        globals: () => GameGlobals | null;
        pickAt: (clientX: number, clientY: number) => ReturnType<typeof buildNpcPickReport> | null;
      };
    }).__mmorpgDebug = {
      globals: () => getActiveGlobals(),
      pickAt: (clientX, clientY) => {
        const active = getActiveGlobals();
        if (!active?.initialized) return null;
        return buildNpcPickReport(
          active.camera,
          canvas,
          active.npcPickTargets,
          clientX,
          clientY,
        );
      },
    };
  }

  const systems: GameSystem[] = [
    createOceanShaderSystem(),
    createCameraFollowSystem(),
    createPlayerInputSystem(),
    createNpcInteractionSystem(),
    createBoatPhysicsSystem(),
    createBobbingSystem(),
    createMeshSyncSystem(),
    createBoatSmokeSystem(),
  ].sort((a, b) => a.priority - b.priority);

  initWorld(world, globals);
  initSystems(systems, world, globals);

  let frameId = 0;
  let elapsed = 0;

  const tick = () => {
    frameId = requestAnimationFrame(tick);
    const delta = clock.getDelta();
    elapsed += delta;
    runSystems(systems, world, globals, delta);
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
      const active = getActiveGlobals();
      if (active) {
        active.joltWorld = null;
        active.oceanMaterial = null;
        active.quarksRenderer = null;
        active.initialized = false;
      }
    },
  };
}
