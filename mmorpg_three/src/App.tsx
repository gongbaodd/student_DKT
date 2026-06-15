import GameCanvas from "./game/GameCanvas";
import NpcPickDebugOverlay from "./ui/NpcPickDebugOverlay";
import NpcPredictionRadar from "./ui/NpcPredictionRadar";
import NpcRadialMenu from "./ui/NpcRadialMenu";

export default function App() {
  return (
    <>
      <GameCanvas />
      <NpcPredictionRadar />
      <NpcRadialMenu />
      <NpcPickDebugOverlay />
      <p className="hud-hint">Right-drag to orbit · Left-click NPC ships · W to sail</p>
    </>
  );
}
