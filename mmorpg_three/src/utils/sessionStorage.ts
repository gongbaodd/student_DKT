import type { SessionState } from "../action/types";

const STORAGE_KEY = "mmorpg-action-session";

export function loadSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

export function saveSession(state: SessionState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function emptySession(): SessionState {
  return {
    actionHistory: [],
    interactionHistory: [],
  };
}
