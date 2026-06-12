import type { Museum } from "../dkt/types";

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickNextMuseum(
  museums: Museum[],
  swipedIds: Set<number>,
  clusterScores: number[] | null,
): Museum | null {
  const unseen = museums.filter((m) => !swipedIds.has(m.museumId));
  if (unseen.length === 0) return null;

  if (!clusterScores || clusterScores.length === 0) {
    return shuffle(unseen)[0];
  }

  let bestScore = -1;
  const candidates: Museum[] = [];

  for (const museum of unseen) {
    const score = clusterScores[museum.clusterId] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      candidates.length = 0;
      candidates.push(museum);
    } else if (score === bestScore) {
      candidates.push(museum);
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}
