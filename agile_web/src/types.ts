export interface DoneIssue {
  project: string;
  issueKey: string;
  title: string;
  description: string;
  storyPoints: number;
  component: number;
  cluster: number;
}

export interface TodoIssue {
  project: string;
  issueKey: string;
  title: string;
  description: string;
  originalStoryPoints: number;
  component: number;
  cluster: number;
}

export interface ClusterNameEntry {
  cluster: number;
  clusterName: string;
  issueCount: number;
}

export type ClusterNameMap = Record<number, string>;

export function buildClusterNameMap(entries: ClusterNameEntry[]): ClusterNameMap {
  return Object.fromEntries(entries.map((entry) => [entry.cluster, entry.clusterName]));
}

export function clusterNameFor(
  cluster: number,
  clusterNames: ClusterNameMap | null,
): string {
  return clusterNames?.[cluster] ?? `cluster-${cluster}`;
}

export const KEYWORD_COMPONENTS = [
  "forum",
  "quiz",
  "grade",
  "theme",
  "general",
] as const;

export type KeywordComponent = (typeof KEYWORD_COMPONENTS)[number];

export function keywordNameFor(component: number): string {
  return KEYWORD_COMPONENTS[component] ?? `unknown-${component}`;
}

const KEYWORD_COLORS = ["blue", "grape", "orange", "violet", "indigo"] as const;

export function keywordColorFor(component: number): ClusterColor {
  const index =
    ((component % KEYWORD_COLORS.length) + KEYWORD_COLORS.length) %
    KEYWORD_COLORS.length;
  return KEYWORD_COLORS[index];
}

const CLUSTER_COLORS = [
  "blue",
  "cyan",
  "teal",
  "green",
  "lime",
  "yellow",
  "orange",
  "red",
  "pink",
  "grape",
  "violet",
  "indigo",
  "blue",
  "teal",
  "green",
  "orange",
  "grape",
  "cyan",
  "pink",
  "indigo",
] as const;

export type ClusterColor = (typeof CLUSTER_COLORS)[number];

export function clusterColorFor(cluster: number): ClusterColor {
  const index =
    ((cluster % CLUSTER_COLORS.length) + CLUSTER_COLORS.length) %
    CLUSTER_COLORS.length;
  return CLUSTER_COLORS[index];
}
