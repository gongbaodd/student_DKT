import GameCanvas from "./game/GameCanvas";

export default function App() {
  return (
    <>
      <GameCanvas />
      <p className="hud-hint">WASD — sail your ship</p>
    </>
  );
}
