import { useCallback, useEffect, useMemo, useState } from "react";

import { DktModel } from "../dkt/model";
import type { EncodedVector, Museum, Skill, SwipeRecord } from "../dkt/types";
import { pickNextMuseum } from "../utils/pickNextMuseum";
import { clearSession, loadSession, saveSession } from "../utils/sessionStorage";

export interface DktSession {
  model: DktModel;
  museums: Museum[];
  skills: Skill[];
  currentMuseum: Museum | null;
  nextMuseum: Museum | null;
  encodedHistory: EncodedVector[];
  swipeHistory: SwipeRecord[];
  predictions: number[] | null;
  currentPrediction: number | null;
  swipedCount: number;
  likedCount: number;
  remainingCount: number;
  isLoading: boolean;
  loadError: string | null;
  swipe: (liked: boolean) => Promise<void>;
  reset: () => void;
}

export function useDktSession(): DktSession {
  const [model, setModel] = useState<DktModel | null>(null);
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [encodedHistory, setEncodedHistory] = useState<EncodedVector[]>([]);
  const [swipeHistory, setSwipeHistory] = useState<SwipeRecord[]>([]);
  const [swipedIds, setSwipedIds] = useState<Set<number>>(new Set());
  const [currentMuseum, setCurrentMuseum] = useState<Museum | null>(null);
  const [nextMuseum, setNextMuseum] = useState<Museum | null>(null);
  const [predictions, setPredictions] = useState<number[] | null>(null);
  const [currentPrediction, setCurrentPrediction] = useState<number | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const updatePredictions = useCallback(
    async (dkt: DktModel, history: EncodedVector[], museum: Museum) => {
      const result = await dkt.predictNext(history, museum.clusterId);
      setPredictions(result.allSkills);
      setCurrentPrediction(result.currentSkill);
    },
    [],
  );

  const selectNextCards = useCallback(
    async (
      dkt: DktModel,
      allMuseums: Museum[],
      swiped: Set<number>,
      history: EncodedVector[],
      clusterScores: number[] | null,
    ) => {
      const current = pickNextMuseum(allMuseums, swiped, clusterScores);
      if (!current) {
        setCurrentMuseum(null);
        setNextMuseum(null);
        setCurrentPrediction(null);
        return;
      }

      const nextSwiped = new Set(swiped);
      nextSwiped.add(current.museumId);
      const next = pickNextMuseum(allMuseums, nextSwiped, clusterScores);

      setCurrentMuseum(current);
      setNextMuseum(next);
      await updatePredictions(dkt, history, current);
    },
    [updatePredictions],
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [dkt, museumsRes, skillsRes] = await Promise.all([
          DktModel.load(),
          fetch("/museums.json"),
          fetch("/skills.json"),
        ]);

        if (!museumsRes.ok || !skillsRes.ok) {
          throw new Error("Failed to load museum data");
        }

        const museumData = (await museumsRes.json()) as Museum[];
        const skillData = (await skillsRes.json()) as Skill[];

        if (cancelled) return;

        setModel(dkt);
        setMuseums(museumData);
        setSkills(skillData);

        const saved = loadSession();
        const history = saved?.encodedHistory ?? [];
        const swipes = saved?.swipeHistory ?? [];
        const ids = new Set(saved?.swipedIds ?? []);

        setEncodedHistory(history);
        setSwipeHistory(swipes);
        setSwipedIds(ids);

        let clusterScores: number[] | null = null;
        if (history.length > 0) {
          const probe = pickNextMuseum(museumData, ids, null);
          if (probe) {
            const result = await dkt.predictNext(history, probe.clusterId);
            clusterScores = result.allSkills;
            setPredictions(result.allSkills);
          }
        }

        await selectNextCards(dkt, museumData, ids, history, clusterScores);
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : "Failed to initialize",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [selectNextCards]);

  useEffect(() => {
    if (isLoading) return;
    saveSession({
      encodedHistory,
      swipeHistory,
      swipedIds: [...swipedIds],
    });
  }, [encodedHistory, swipeHistory, swipedIds, isLoading]);

  const swipe = useCallback(
    async (liked: boolean) => {
      if (!model || !currentMuseum) return;

      const predictedLike = currentPrediction ?? 0.5;
      const encoded = model.encode(currentMuseum.clusterId, liked);
      const nextHistory = [...encodedHistory, encoded];

      const record: SwipeRecord = {
        museumId: currentMuseum.museumId,
        museumName: currentMuseum.name,
        clusterId: currentMuseum.clusterId,
        clusterName: currentMuseum.clusterName,
        liked,
        predictedLike,
      };

      const nextSwiped = new Set(swipedIds);
      nextSwiped.add(currentMuseum.museumId);

      const result = await model.predictNext(nextHistory, currentMuseum.clusterId);

      setEncodedHistory(nextHistory);
      setSwipeHistory((prev) => [record, ...prev]);
      setSwipedIds(nextSwiped);
      setPredictions(result.allSkills);

      const promoted = nextMuseum;
      if (promoted) {
        setCurrentMuseum(promoted);
        const furtherSwiped = new Set(nextSwiped);
        furtherSwiped.add(promoted.museumId);
        const upcoming = pickNextMuseum(
          museums,
          furtherSwiped,
          result.allSkills,
        );
        setNextMuseum(upcoming);
        await updatePredictions(model, nextHistory, promoted);
      } else {
        await selectNextCards(
          model,
          museums,
          nextSwiped,
          nextHistory,
          result.allSkills,
        );
      }
    },
    [
      model,
      currentMuseum,
      currentPrediction,
      encodedHistory,
      swipedIds,
      nextMuseum,
      museums,
      updatePredictions,
      selectNextCards,
    ],
  );

  const reset = useCallback(() => {
    clearSession();
    setEncodedHistory([]);
    setSwipeHistory([]);
    setSwipedIds(new Set());
    setPredictions(null);
    setCurrentPrediction(null);

    if (model && museums.length > 0) {
      void selectNextCards(model, museums, new Set(), [], null);
    }
  }, [model, museums, selectNextCards]);

  const likedCount = useMemo(
    () => swipeHistory.filter((s) => s.liked).length,
    [swipeHistory],
  );

  return {
    model: model!,
    museums,
    skills,
    currentMuseum,
    nextMuseum,
    encodedHistory,
    swipeHistory,
    predictions,
    currentPrediction,
    swipedCount: swipedIds.size,
    likedCount,
    remainingCount: museums.length - swipedIds.size,
    isLoading,
    loadError,
    swipe,
    reset,
  };
}
