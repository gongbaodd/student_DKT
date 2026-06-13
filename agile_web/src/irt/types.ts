export interface TicketMeta {
  index: number;
  component: number;
}

export interface ModelMetadata {
  modelType: string;
  componentField?: string;
  maxPoints: number;
  embedDim: number;
  hiddenDim: number;
  numComponents: number;
  numTickets: number;
  components: string[];
  tickets: Record<string, TicketMeta>;
  maxHistory: number;
  opset: number;
}

export interface DoneHistoryEntry {
  issueKey: string;
  storyPoints: number;
  component: number;
}
