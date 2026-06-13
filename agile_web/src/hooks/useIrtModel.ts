import { useEffect, useState } from "react";

import { CLUSTER_MODEL, IrtModel, KEYWORD_MODEL } from "../irt/model";

export function useIrtModels() {
  const [keywordModel, setKeywordModel] = useState<IrtModel | null>(null);
  const [clusterModel, setClusterModel] = useState<IrtModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([IrtModel.load(KEYWORD_MODEL), IrtModel.load(CLUSTER_MODEL)])
      .then(([keyword, cluster]) => {
        if (!cancelled) {
          setKeywordModel(keyword);
          setClusterModel(cluster);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load IRT models");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { keywordModel, clusterModel, isLoading, error };
}
