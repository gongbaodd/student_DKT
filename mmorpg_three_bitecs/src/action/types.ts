export type ActionId = 0 | 1 | 2 | 3;

export interface ModelMetadata {
  modelType: "next-action-lstm";
  numActions: number;
  inputDim: number;
  hiddenDim: number;
  actions: string[];
  opset: number;
}

export interface NpcInteractionRecord {
  entityIndex: number;
  action: string;
  actionId: ActionId;
}

export type EncodedVector = number[];

export interface SessionState {
  actionHistory: ActionId[];
  interactionHistory: NpcInteractionRecord[];
}
