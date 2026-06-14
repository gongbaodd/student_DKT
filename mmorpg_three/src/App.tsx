import GameCanvas from "./game/GameCanvas";
import NpcRadialMenu from "./ui/NpcRadialMenu";

export default function App() {
  return (
    <>
      <GameCanvas />
      <NpcRadialMenu />
      <p className="hud-hint">Right-drag to orbit · Left-click NPC ships · W to sail</p>
    </>
  );
}
