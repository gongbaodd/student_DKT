import { useCallback, useEffect, useState } from "react";

import { DktModel } from "../dkt/model";
import type {
  AmountBins,
  DemoProfile,
  EncodedVector,
  FraudAnalysis,
  HistoryEntry,
} from "../dkt/types";
import { legitToFraudProb } from "../utils/fraudScore";
import { resolveSkill } from "../utils/skills";
import { clearSession, loadSession, saveSession } from "../utils/sessionStorage";

export interface LoadedFraudSession {
  model: DktModel;
  amountEdges: number[];
  demoProfiles: DemoProfile[];
  encodedHistory: EncodedVector[];
  historyLog: HistoryEntry[];
  predictions: number[] | null;
  analysis: FraudAnalysis | null;
  selectedProfileId: string | null;
  isLoading: false;
  loadError: null;
  loadDemoProfile: (profileId: string) => Promise<void>;
  addPastTransaction: (
    productCD: string,
    amount: number,
    isFraud: boolean,
  ) => Promise<void>;
  analyzeTransaction: (productCD: string, amount: number) => Promise<void>;
  confirmTransaction: (isFraud: boolean) => Promise<void>;
  reset: () => void;
}

export type FraudSessionState =
  | { isLoading: true; loadError: null }
  | { isLoading: false; loadError: string }
  | LoadedFraudSession;

function makeHistoryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useFraudSession(): FraudSessionState {
  const [model, setModel] = useState<DktModel | null>(null);
  const [amountEdges, setAmountEdges] = useState<number[]>([]);
  const [demoProfiles, setDemoProfiles] = useState<DemoProfile[]>([]);
  const [encodedHistory, setEncodedHistory] = useState<EncodedVector[]>([]);
  const [historyLog, setHistoryLog] = useState<HistoryEntry[]>([]);
  const [predictions, setPredictions] = useState<number[] | null>(null);
  const [analysis, setAnalysis] = useState<FraudAnalysis | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const buildHistoryEntry = useCallback(
    (
      dkt: DktModel,
      productCD: string,
      amount: number,
      isFraud: boolean,
      predictedLegit?: number,
    ): HistoryEntry => {
      const resolved = resolveSkill(
        productCD,
        amount,
        dkt.metadata,
        amountEdges,
      );
      return {
        id: makeHistoryId(),
        productCD,
        amount,
        quartile: resolved.quartile,
        skillId: resolved.skillId,
        skillLabel: resolved.skillLabel,
        isFraud,
        predictedLegit,
      };
    },
    [amountEdges],
  );

  const applyHistory = useCallback(
    async (
      dkt: DktModel,
      history: EncodedVector[],
      log: HistoryEntry[],
      profileId: string | null,
    ) => {
      setEncodedHistory(history);
      setHistoryLog(log);
      setSelectedProfileId(profileId);
      setAnalysis(null);

      if (history.length > 0) {
        const last = log[log.length - 1];
        const result = await dkt.predictNext(history, last.skillId);
        setPredictions(result.allSkills);
      } else {
        setPredictions(null);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [dkt, binsRes, profilesRes] = await Promise.all([
          DktModel.load(),
          fetch("/amount_bins.json"),
          fetch("/demo_profiles.json"),
        ]);

        if (!binsRes.ok || !profilesRes.ok) {
          throw new Error("Failed to load fraud detection assets");
        }

        const bins = (await binsRes.json()) as AmountBins;
        const profilesPayload = (await profilesRes.json()) as {
          profiles: DemoProfile[];
        };

        if (cancelled) return;

        setModel(dkt);
        setAmountEdges(bins.edges);
        setDemoProfiles(profilesPayload.profiles);

        const saved = loadSession();
        if (saved) {
          setEncodedHistory(saved.encodedHistory);
          setHistoryLog(saved.historyLog);
          setSelectedProfileId(saved.selectedProfileId);

          if (saved.encodedHistory.length > 0) {
            const last = saved.historyLog[saved.historyLog.length - 1];
            const result = await dkt.predictNext(
              saved.encodedHistory,
              last.skillId,
            );
            if (!cancelled) setPredictions(result.allSkills);
          }
        }
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
  }, []);

  useEffect(() => {
    if (isLoading) return;
    saveSession({
      encodedHistory,
      historyLog,
      selectedProfileId,
    });
  }, [encodedHistory, historyLog, selectedProfileId, isLoading]);

  const loadDemoProfile = useCallback(
    async (profileId: string) => {
      if (!model) return;
      const profile = demoProfiles.find((item) => item.id === profileId);
      if (!profile) return;

      const history: EncodedVector[] = [];
      const log: HistoryEntry[] = [];

      for (const tx of profile.transactions) {
        const resolved = resolveSkill(
          tx.productCD,
          tx.amount,
          model.metadata,
          amountEdges,
        );
        history.push(model.encode(resolved.skillId, !tx.isFraud));
        log.push(
          buildHistoryEntry(
            model,
            tx.productCD,
            tx.amount,
            tx.isFraud,
          ),
        );
      }

      await applyHistory(model, history, log, profileId);
    },
    [model, demoProfiles, amountEdges, buildHistoryEntry, applyHistory],
  );

  const addPastTransaction = useCallback(
    async (productCD: string, amount: number, isFraud: boolean) => {
      if (!model) return;

      const resolved = resolveSkill(
        productCD,
        amount,
        model.metadata,
        amountEdges,
      );
      const encoded = model.encode(resolved.skillId, !isFraud);
      const nextHistory = [...encodedHistory, encoded];
      const entry = buildHistoryEntry(model, productCD, amount, isFraud);

      const result = await model.predictNext(nextHistory, resolved.skillId);

      setEncodedHistory(nextHistory);
      setHistoryLog((prev) => [...prev, entry]);
      setSelectedProfileId(null);
      setAnalysis(null);
      setPredictions(result.allSkills);
    },
    [model, amountEdges, encodedHistory, buildHistoryEntry],
  );

  const analyzeTransaction = useCallback(
    async (productCD: string, amount: number) => {
      if (!model) return;

      const resolved = resolveSkill(
        productCD,
        amount,
        model.metadata,
        amountEdges,
      );

      if (encodedHistory.length === 0) {
        const fraudProb = model.metadata.populationFraudRate;
        setAnalysis({
          productCD,
          amount,
          quartile: resolved.quartile,
          skillId: resolved.skillId,
          skillLabel: resolved.skillLabel,
          legitProb: 1 - fraudProb,
          fraudProb,
          isColdStart: true,
        });
        setPredictions(null);
        return;
      }

      const result = await model.predictNext(
        encodedHistory,
        resolved.skillId,
      );
      const legitProb = result.currentSkill;
      const fraudProb = legitToFraudProb(legitProb);

      setPredictions(result.allSkills);
      setAnalysis({
        productCD,
        amount,
        quartile: resolved.quartile,
        skillId: resolved.skillId,
        skillLabel: resolved.skillLabel,
        legitProb,
        fraudProb,
        isColdStart: false,
      });
    },
    [model, amountEdges, encodedHistory],
  );

  const confirmTransaction = useCallback(
    async (isFraud: boolean) => {
      if (!model || !analysis) return;
      await addPastTransaction(analysis.productCD, analysis.amount, isFraud);
      setAnalysis(null);
    },
    [model, analysis, addPastTransaction],
  );

  const reset = useCallback(() => {
    clearSession();
    setEncodedHistory([]);
    setHistoryLog([]);
    setPredictions(null);
    setAnalysis(null);
    setSelectedProfileId(null);
  }, []);

  if (isLoading) {
    return { isLoading: true, loadError: null };
  }

  if (loadError || !model) {
    return { isLoading: false, loadError: loadError ?? "Failed to initialize" };
  }

  return {
    model,
    amountEdges,
    demoProfiles,
    encodedHistory,
    historyLog,
    predictions,
    analysis,
    selectedProfileId,
    isLoading: false,
    loadError: null,
    loadDemoProfile,
    addPastTransaction,
    analyzeTransaction,
    confirmTransaction,
    reset,
  };
}
