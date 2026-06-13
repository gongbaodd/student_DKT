import { Anchor, Typography } from "@mantine/core";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";

const markdownComponents: Components = {
  a: ({ href, children }) => (
    <Anchor href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </Anchor>
  ),
};

interface IssueDescriptionProps {
  content: string;
}

export function IssueDescription({ content }: IssueDescriptionProps) {
  return (
    <Typography>
      <Markdown components={markdownComponents}>{content}</Markdown>
    </Typography>
  );
}
