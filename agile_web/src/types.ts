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
