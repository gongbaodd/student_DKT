import { useEffect, useState } from "react";

import { IrtModel } from "../irt/model";

export function useIrtModel() {
  const [model, setModel] = useState<IrtModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    IrtModel.load()
      .then((loaded) => {
        if (!cancelled) setModel(loaded);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load IRT model");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { model, isLoading, error };
}
