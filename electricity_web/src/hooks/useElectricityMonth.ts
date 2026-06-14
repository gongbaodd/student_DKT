import { useEffect, useMemo, useState } from "react";

import type { CalendarBand, ChartRow, ElectricityMonthData } from "../types";
import { buildCalendarBands, toChartRows } from "../utils/calendarBands";

interface UseElectricityMonthResult {
  data: ElectricityMonthData | null;
  chartRows: ChartRow[];
  calendarBands: CalendarBand[];
  isLoading: boolean;
  error: string | null;
}

export function useElectricityMonth(): UseElectricityMonthResult {
  const [data, setData] = useState<ElectricityMonthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/2014-06.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ElectricityMonthData>;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load electricity data",
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

  const chartRows = useMemo(
    () => (data ? toChartRows(data.points) : []),
    [data],
  );

  const calendarBands = useMemo(
    () => (data ? buildCalendarBands(chartRows, data.holidays) : []),
    [chartRows, data],
  );

  return { data, chartRows, calendarBands, isLoading, error };
}
