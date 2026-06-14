export type NpcMenuAction = "Kill" | "WalkAround" | "AskForQuest" | "Talk";

export interface NpcMenuState {
  entityIndex: number;
  screenX: number;
  screenY: number;
}

export interface PendingNpcAction {
  entityIndex: number;
  action: NpcMenuAction;
}

type Listener = () => void;

let menuState: NpcMenuState | null = null;
const pendingActions: PendingNpcAction[] = [];
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeNpcMenu(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNpcMenuState(): NpcMenuState | null {
  return menuState;
}

export function openNpcMenu(entityIndex: number, screenX: number, screenY: number): void {
  menuState = { entityIndex, screenX, screenY };
  notify();
}

export function updateNpcMenuPosition(screenX: number, screenY: number): void {
  if (!menuState) return;
  menuState = { ...menuState, screenX, screenY };
  notify();
}

export function closeNpcMenu(): void {
  if (!menuState) return;
  menuState = null;
  notify();
}

export function selectNpcAction(entityIndex: number, action: NpcMenuAction): void {
  pendingActions.push({ entityIndex, action });
  menuState = null;
  notify();
}

export function drainPendingNpcActions(): PendingNpcAction[] {
  if (pendingActions.length === 0) return [];
  const actions = pendingActions.splice(0, pendingActions.length);
  return actions;
}

export function resetNpcInteractionStore(): void {
  menuState = null;
  pendingActions.length = 0;
  notify();
}
