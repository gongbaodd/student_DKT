export type SkillId = number;

export interface ModelMetadata {
  numSkills: number;
  inputDim: number;
  hiddenDim: number;
  skills: string[];
  productCodes: string[];
  amountQuartiles: number;
  populationFraudRate: number;
  opset: number;
}

export interface AmountBins {
  edges: number[];
  quartiles: number;
}

export interface DemoTransaction {
  productCD: string;
  amount: number;
  isFraud: boolean;
}

export interface DemoProfile {
  id: string;
  label: string;
  description: string;
  userId: number;
  transactions: DemoTransaction[];
}

export interface HistoryEntry {
  id: string;
  productCD: string;
  amount: number;
  quartile: number;
  skillId: number;
  skillLabel: string;
  isFraud: boolean;
  predictedLegit?: number;
}

export interface FraudAnalysis {
  productCD: string;
  amount: number;
  quartile: number;
  skillId: number;
  skillLabel: string;
  legitProb: number;
  fraudProb: number;
  isColdStart: boolean;
}

export type EncodedVector = number[];

export interface SessionState {
  encodedHistory: EncodedVector[];
  historyLog: HistoryEntry[];
  selectedProfileId: string | null;
}
