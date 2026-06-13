import { useEffect, useMemo, useState } from "react";

import {
  buildClusterNameMap,
  type ClusterNameEntry,
} from "../types";

export function useClusterNames() {
  const [entries, setEntries] = useState<ClusterNameEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/cluster_names.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ClusterNameEntry[]>;
      })
      .then((items) => {
        if (!cancelled) setEntries(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load cluster_names.json",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const clusterNames = useMemo(() => buildClusterNameMap(entries), [entries]);

  return { clusterNames, isLoading, error };
}
