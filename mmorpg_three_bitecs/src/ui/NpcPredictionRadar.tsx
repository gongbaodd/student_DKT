import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

import { useNpcActionSession } from "../hooks/useNpcActionSession";

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function NpcPredictionRadar() {
  const {
    actionProbs,
    actionLabels,
    predictedAction,
    interactionCount,
    isLoading,
    loadError,
  } = useNpcActionSession();

  const option = useMemo((): EChartsOption => {
    const values = actionProbs ?? actionLabels.map(() => 0);

    return {
      backgroundColor: "transparent",
      title: {
        text: "Next choice",
        subtext: predictedAction ? `Likely: ${predictedAction}` : "No prediction yet",
        left: "center",
        top: 0,
        textStyle: {
          color: "rgba(255, 255, 255, 0.92)",
          fontSize: 14,
          fontWeight: 600,
        },
        subtextStyle: {
          color: "rgba(255, 255, 255, 0.72)",
          fontSize: 11,
        },
      },
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const data = params as { name?: string; value?: number[] };
          if (!data.value) return "";
          return actionLabels
            .map((label, index) => `${label}: ${formatPercent(data.value![index] ?? 0)}`)
            .join("<br/>");
        },
      },
      radar: {
        center: ["50%", "58%"],
        radius: "62%",
        splitNumber: 4,
        axisName: {
          color: "rgba(255, 255, 255, 0.85)",
          fontSize: 11,
          formatter: (name?: string) => {
            if (name && name === predictedAction) {
              return `{strong|${name}}`;
            }
            return name ?? "";
          },
          rich: {
            strong: {
              color: "#ffd166",
              fontWeight: 700,
            },
          },
        },
        splitLine: {
          lineStyle: {
            color: "rgba(255, 255, 255, 0.12)",
          },
        },
        splitArea: {
          areaStyle: {
            color: ["rgba(255, 255, 255, 0.02)", "rgba(255, 255, 255, 0.05)"],
          },
        },
        axisLine: {
          lineStyle: {
            color: "rgba(255, 255, 255, 0.18)",
          },
        },
        indicator: actionLabels.map((name) => ({
          name,
          max: 1,
        })),
      },
      series: [
        {
          type: "radar",
          symbol: "circle",
          symbolSize: 5,
          lineStyle: {
            color: "#4cc9f0",
            width: 2,
          },
          areaStyle: {
            color: "rgba(76, 201, 240, 0.25)",
          },
          itemStyle: {
            color: "#4cc9f0",
          },
          data: [
            {
              value: values,
              name: "Predicted",
            },
          ],
        },
      ],
    };
  }, [actionProbs, actionLabels, predictedAction]);

  return (
    <div className="npc-prediction-radar">
      <div className="npc-prediction-radar__header">
        <span className="npc-prediction-radar__title">Action prediction</span>
        <span className="npc-prediction-radar__meta">
          {isLoading
            ? "Loading model…"
            : loadError
              ? "Model unavailable"
              : `${interactionCount} interactions`}
        </span>
      </div>
      {loadError ? (
        <p className="npc-prediction-radar__error">{loadError}</p>
      ) : (
        <ReactECharts
          option={option}
          style={{ width: "100%", height: "240px" }}
          opts={{ renderer: "canvas" }}
        />
      )}
    </div>
  );
}
