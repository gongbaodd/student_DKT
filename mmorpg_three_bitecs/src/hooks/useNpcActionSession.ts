import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionPredictorModel } from "../action/model";
import type { ActionId, EncodedVector, NpcInteractionRecord } from "../action/types";
import {
  NPC_MENU_ACTIONS,
  npcActionToId,
  subscribeNpcActions,
  subscribeNpcMenu,
  type NpcMenuAction,
} from "../game/interaction/npcInteractionStore";
import { loadSession, saveSession } from "../utils/sessionStorage";

export interface NpcActionSession {
  actionProbs: number[] | null;
  actionLabels: string[];
  predictedAction: NpcMenuAction | null;
  interactionCount: number;
  isLoading: boolean;
  loadError: string | null;
}

function predictedActionFromProbs(probs: number[] | null): NpcMenuAction | null {
  if (!probs || probs.length === 0) return null;

  let bestIndex = 0;
  for (let index = 1; index < probs.length; index++) {
    if (probs[index] > probs[bestIndex]) {
      bestIndex = index;
    }
  }

  return NPC_MENU_ACTIONS[bestIndex] ?? null;
}

function buildEncodedHistory(
  model: ActionPredictorModel,
  actionHistory: ActionId[],
): EncodedVector[] {
  return actionHistory.map((actionId) => model.encode(actionId));
}

export function useNpcActionSession(): NpcActionSession {
  const [model, setModel] = useState<ActionPredictorModel | null>(null);
  const [actionHistory, setActionHistory] = useState<ActionId[]>([]);
  const [interactionHistory, setInteractionHistory] = useState<NpcInteractionRecord[]>([]);
  const [actionProbs, setActionProbs] = useState<number[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshPredictions = useCallback(
    async (predictor: ActionPredictorModel, history: ActionId[]) => {
      const encodedHistory = buildEncodedHistory(predictor, history);
      const result = await predictor.predictNext(encodedHistory);
      setActionProbs(result.actionProbs);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const predictor = await ActionPredictorModel.load();
        if (cancelled) return;

        const saved = loadSession();
        const history = saved?.actionHistory ?? [];
        const interactions = saved?.interactionHistory ?? [];

        setModel(predictor);
        setActionHistory(history);
        setInteractionHistory(interactions);
        await refreshPredictions(predictor, history);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load action model");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [refreshPredictions]);

  useEffect(() => {
    if (!model) return;

    const onMenuChange = () => {
      void refreshPredictions(model, actionHistory);
    };

    return subscribeNpcMenu(onMenuChange);
  }, [model, actionHistory, refreshPredictions]);

  useEffect(() => {
    if (!model) return;

    return subscribeNpcActions((pending) => {
      const actionId = npcActionToId(pending.action);
      const record: NpcInteractionRecord = {
        entityIndex: pending.entityIndex,
        action: pending.action,
        actionId,
      };

      setActionHistory((previous) => {
        const next = [...previous, actionId];
        setInteractionHistory((previousRecords) => {
          const nextRecords = [...previousRecords, record];
          saveSession({
            actionHistory: next,
            interactionHistory: nextRecords,
          });
          return nextRecords;
        });
        void refreshPredictions(model, next);
        return next;
      });
    });
  }, [model, refreshPredictions]);

  const actionLabels = useMemo(
    () => model?.metadata.actions ?? [...NPC_MENU_ACTIONS],
    [model],
  );

  const predictedAction = useMemo(
    () => predictedActionFromProbs(actionProbs),
    [actionProbs],
  );

  return {
    actionProbs,
    actionLabels,
    predictedAction,
    interactionCount: interactionHistory.length,
    isLoading,
    loadError,
  };
}
