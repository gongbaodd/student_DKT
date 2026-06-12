export type SkillId = number;

export interface ModelMetadata {
  numSkills: number;
  inputDim: number;
  hiddenDim: number;
  skills: string[];
  opset: number;
}

export interface Museum {
  museumId: number;
  name: string;
  city: string;
  clusterId: number;
  clusterName: string;
  imageUrl: string;
  url: string;
  location: string;
}

export interface Skill {
  clusterId: number;
  clusterName: string;
  museumCount: number;
}

export interface SwipeRecord {
  museumId: number;
  museumName: string;
  clusterId: number;
  clusterName: string;
  liked: boolean;
  predictedLike: number;
}

export type EncodedVector = number[];

export interface SessionState {
  encodedHistory: EncodedVector[];
  swipeHistory: SwipeRecord[];
  swipedIds: number[];
}
