import type { EncodedVector } from "./types";

export function encodeAction(
  actionId: number,
  numActions: number,
): EncodedVector {
  if (actionId < 0 || actionId >= numActions) {
    throw new Error(`actionId must be in [0, ${numActions}), got ${actionId}`);
  }

  const vector = new Array<number>(numActions).fill(0);
  vector[actionId] = 1;
  return vector;
}
