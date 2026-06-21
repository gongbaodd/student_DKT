import type { NpcPickCandidate, NpcPickReport } from "./pickNpcBoat";

type Listener = () => void;

let lastReport: NpcPickReport | null = null;
let liveCandidates: NpcPickCandidate[] = [];
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function setLastPickReport(report: NpcPickReport): void {
  lastReport = report;
  notify();
}

export function setLiveCandidates(candidates: NpcPickCandidate[]): void {
  liveCandidates = candidates;
  notify();
}

export function getLastPickReport(): NpcPickReport | null {
  return lastReport;
}

export function getLiveCandidates(): readonly NpcPickCandidate[] {
  return liveCandidates;
}

export function subscribePickDebug(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
