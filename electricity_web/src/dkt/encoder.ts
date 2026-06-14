import type { EncodedVector } from "./types";

export function encodeInteraction(
  skillId: number,
  correct: boolean,
  numSkills: number,
): EncodedVector {
  if (skillId < 0 || skillId >= numSkills) {
    throw new Error(`skillId must be in [0, ${numSkills}), got ${skillId}`);
  }

  const vector = new Array<number>(2 * numSkills).fill(0);
  const index = correct ? skillId : numSkills + skillId;
  vector[index] = 1;
  return vector;
}
