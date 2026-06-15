export type NpcMenuAction = "Kill" | "WalkAround" | "AskForQuest" | "Talk";

export const NPC_MENU_ACTIONS: readonly NpcMenuAction[] = [
  "Kill",
  "WalkAround",
  "AskForQuest",
  "Talk",
];

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
type ActionListener = (pending: PendingNpcAction) => void;

let menuState: NpcMenuState | null = null;
const pendingActions: PendingNpcAction[] = [];
const listeners = new Set<Listener>();
const actionListeners = new Set<ActionListener>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeNpcMenu(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function subscribeNpcActions(listener: ActionListener): () => void {
  actionListeners.add(listener);
  return () => actionListeners.delete(listener);
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
  const pending: PendingNpcAction = { entityIndex, action };
  pendingActions.push(pending);
  menuState = null;
  for (const listener of actionListeners) {
    listener(pending);
  }
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

export function npcActionToId(action: NpcMenuAction): 0 | 1 | 2 | 3 {
  const actionId = NPC_MENU_ACTIONS.indexOf(action);
  if (actionId < 0) {
    throw new Error(`Unknown NPC menu action: ${action}`);
  }
  return actionId as 0 | 1 | 2 | 3;
}
