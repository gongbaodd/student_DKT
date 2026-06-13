export interface DoneIssue {
  project: string;
  issueKey: string;
  title: string;
  description: string;
  storyPoints: number;
  component: number;
}

export interface TodoIssue {
  project: string;
  issueKey: string;
  title: string;
  description: string;
  originalStoryPoints: number;
  component: number;
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
  component: number,
  clusterNames: ClusterNameMap | null,
): string {
  return clusterNames?.[component] ?? `cluster-${component}`;
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

export function clusterColorFor(component: number): ClusterColor {
  const index =
    ((component % CLUSTER_COLORS.length) + CLUSTER_COLORS.length) %
    CLUSTER_COLORS.length;
  return CLUSTER_COLORS[index];
}
