export type SkillId = 0 | 1 | 2;

export interface ModelMetadata {
  numSkills: number;
  inputDim: number;
  hiddenDim: number;
  skills: string[];
  opset: number;
}

export type EncodedVector = number[];

export type TradingAction = "buy" | "hold" | "sell";
