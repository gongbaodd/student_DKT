import { createSystem } from "elics";

import { getGlobalsFromSystem } from "../../globals";
import { PlayerControlled, Throttle } from "../components";

const queries = {
  players: { required: [PlayerControlled, Throttle] },
};

export class PlayerInputSystem extends createSystem(queries) {
  update(): void {
    const keys = getGlobalsFromSystem(this.globals).keysPressed;
    const forward = keys.has("w") || keys.has("W");

    for (const entity of this.queries.players.entities) {
      entity.setValue(Throttle, "amount", forward ? 1 : 0);
    }
  }
}
