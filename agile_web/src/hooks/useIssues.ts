import { useEffect, useState } from "react";

import type { DoneIssue, TodoIssue } from "../types";

function useJsonFetch<T>(url: string) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T[]>;
      })
      .then((items) => {
        if (!cancelled) setData(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : `Failed to load ${url}`);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, isLoading, error };
}

export function useDoneIssues() {
  return useJsonFetch<DoneIssue>("/done.json");
}

export function useTodoIssues() {
  return useJsonFetch<TodoIssue>("/todos.json");
}
