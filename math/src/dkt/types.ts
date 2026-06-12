export type SkillId = 0 | 1 | 2;

export interface ModelMetadata {
  numSkills: number;
  inputDim: number;
  hiddenDim: number;
  skills: string[];
  opset: number;
}

export interface InteractionRecord {
  skillId: SkillId;
  skillName: string;
  correct: boolean;
  prompt: string;
}

export interface Question {
  skillId: SkillId;
  skillName: string;
  prompt: string;
  answer: number;
}

export type EncodedVector = number[];
