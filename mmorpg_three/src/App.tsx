import GameCanvas from "./game/GameCanvas";

export default function App() {
  return (
    <>
      <GameCanvas />
      <p className="hud-hint">Drag to orbit · W to sail forward</p>
    </>
  );
}
