import { FormEvent, useCallback, useEffect, useState } from "react";

import { DktModel } from "./dkt/model";
import type { EncodedVector, InteractionRecord, Question } from "./dkt/types";
import { generateQuestion } from "./questions/generator";

const HISTORY_LIMIT = 5;
const NEXT_QUESTION_DELAY_MS = 900;

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function masteryLabel(probability: number): string {
  if (probability >= 0.7) return "likely to handle";
  if (probability >= 0.45) return "might handle";
  return "may struggle with";
}

export default function App() {
  const [model, setModel] = useState<DktModel | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [history, setHistory] = useState<EncodedVector[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<InteractionRecord[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [predictions, setPredictions] = useState<number[] | null>(null);
  const [currentSkillPrediction, setCurrentSkillPrediction] = useState<
    number | null
  >(null);

  const updatePredictions = useCallback(
    async (dkt: DktModel, encodedHistory: EncodedVector[], q: Question) => {
      const result = await dkt.predictNext(encodedHistory, q.skillId);
      setPredictions(result.allSkills);
      setCurrentSkillPrediction(result.currentSkill);
    },
    [],
  );

  const loadNextQuestion = useCallback(
    async (dkt: DktModel, encodedHistory: EncodedVector[]) => {
      const next = generateQuestion(dkt.metadata);
      setQuestion(next);
      setAnswer("");
      setFeedback(null);
      await updatePredictions(dkt, encodedHistory, next);
    },
    [updatePredictions],
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const dkt = await DktModel.load();
        if (cancelled) return;
        setModel(dkt);
        await loadNextQuestion(dkt, []);
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : "Failed to load model",
        );
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [loadNextQuestion]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!model || !question || isSubmitting) return;

    const parsed = Number.parseInt(answer.trim(), 10);
    if (Number.isNaN(parsed)) {
      setFeedback("Enter a whole number.");
      return;
    }

    setIsSubmitting(true);
    const correct = parsed === question.answer;
    setFeedback(
      correct
        ? `Correct! ${question.prompt.replace(" = ?", "")} = ${question.answer}`
        : `Not quite. The answer is ${question.answer}.`,
    );

    const encoded = model.encode(question.skillId, correct);
    const nextHistory = [...history, encoded];
    const attempt: InteractionRecord = {
      skillId: question.skillId,
      skillName: question.skillName,
      correct,
      prompt: question.prompt,
    };

    setHistory(nextHistory);
    setRecentAttempts((prev) => [attempt, ...prev].slice(0, HISTORY_LIMIT));

    window.setTimeout(() => {
      void loadNextQuestion(model, nextHistory).finally(() => {
        setIsSubmitting(false);
      });
    }, NEXT_QUESTION_DELAY_MS);
  }

  if (loadError) {
    return (
      <div className="app">
        <header className="header">
          <h1>Math Practice</h1>
          <p className="subtitle">Deep Knowledge Tracing demo</p>
        </header>
        <main className="main">
          <p className="error">Failed to load model: {loadError}</p>
        </main>
      </div>
    );
  }

  if (!model || !question || currentSkillPrediction === null || !predictions) {
    return (
      <div className="app">
        <header className="header">
          <h1>Math Practice</h1>
          <p className="subtitle">Deep Knowledge Tracing demo</p>
        </header>
        <main className="main">
          <p className="loading">Loading model…</p>
        </main>
      </div>
    );
  }

  const hasHistory = history.length > 0;

  return (
    <div className="app">
      <header className="header">
        <h1>Math Practice</h1>
        <p className="subtitle">Deep Knowledge Tracing demo</p>
      </header>

      <main className="main">
        <section className="question-card" aria-live="polite">
          <span className="skill-badge">{question.skillName}</span>
          <p className="question-text">{question.prompt}</p>

          <form className="answer-form" onSubmit={handleSubmit}>
            <label htmlFor="answer">Your answer</label>
            <div className="answer-row">
              <input
                id="answer"
                type="text"
                inputMode="numeric"
                pattern="-?[0-9]*"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                disabled={isSubmitting}
                autoFocus
                autoComplete="off"
              />
              <button type="submit" disabled={isSubmitting || answer.trim() === ""}>
                Submit
              </button>
            </div>
          </form>

          {feedback && <p className="feedback">{feedback}</p>}
        </section>

        <section className="history-card">
          <h2>Recent attempts</h2>
          {recentAttempts.length === 0 ? (
            <p className="muted">Answer a question to build your history.</p>
          ) : (
            <ul className="history-list">
              {recentAttempts.map((attempt, index) => (
                <li key={`${attempt.prompt}-${index}`}>
                  <span>{attempt.prompt}</span>
                  <span className={attempt.correct ? "tag ok" : "tag miss"}>
                    {attempt.correct ? "Correct" : "Miss"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="prediction-bar">
        <div className="prediction-summary">
          <p className="prediction-title">Model guess</p>
          <p className="prediction-value">
            {formatPercent(currentSkillPrediction)} —{" "}
            {masteryLabel(currentSkillPrediction)}{" "}
            <strong>{question.skillName}</strong>
          </p>
          {!hasHistory && (
            <p className="muted baseline-note">
              No history yet — baseline guess from untrained state.
            </p>
          )}
        </div>

        <div className="skill-bars">
          {model.metadata.skills.map((skill, index) => (
            <div className="skill-bar" key={skill}>
              <div className="skill-bar-label">
                <span>{skill}</span>
                <span>{formatPercent(predictions[index])}</span>
              </div>
              <div className="skill-bar-track">
                <div
                  className="skill-bar-fill"
                  style={{ width: `${predictions[index] * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
