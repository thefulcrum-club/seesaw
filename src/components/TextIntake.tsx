// src/components/TextIntake.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { backendUrl } from "@/lib/backend";
import type { ResearchState, VoiceExchange } from "@/lib/types";

type Phase = "loading-question" | "ready-to-answer" | "submitting";

export function TextIntake({
  researchState,
  onComplete,
}: {
  researchState: ResearchState;
  onComplete: (exchanges: VoiceExchange[]) => void;
}) {
  const [exchanges, setExchanges] = useState<VoiceExchange[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<Phase>("loading-question");
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  async function fetchNextQuestion(exchangesSoFar: VoiceExchange[]) {
    setPhase("loading-question");
    setError(null);
    try {
      const res = await fetch(backendUrl("/voice-question"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchState: { ...researchState, voiceExchanges: exchangesSoFar },
        }),
      });
      if (!res.ok) {
        throw new Error(`voice-question request failed: ${res.status}`);
      }
      const data = (await res.json()) as { question: string | null; done: boolean };
      if (data.done || !data.question) {
        onComplete(exchangesSoFar);
        return;
      }
      setCurrentQuestion(data.question);
      setAnswer("");
      setPhase("ready-to-answer");
    } catch {
      setError("Couldn't load the next question. Please retry.");
    }
  }

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      fetchNextQuestion([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitAnswer() {
    if (!currentQuestion || !answer.trim()) return;
    setPhase("submitting");
    const newExchanges = [
      ...exchanges,
      { question: currentQuestion, answerTranscript: answer.trim() },
    ];
    setExchanges(newExchanges);
    await fetchNextQuestion(newExchanges);
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <p className="text-sm text-gray-500 text-center">
        Question {exchanges.length + 1} of ~6-8
      </p>
      {phase === "loading-question" && !error && (
        <p className="text-center">Thinking of the next question...</p>
      )}
      {phase !== "loading-question" && currentQuestion && (
        <p className="text-lg font-medium text-center">{currentQuestion}</p>
      )}
      {error && <p className="text-red-600 text-sm text-center">{error}</p>}
      {phase === "loading-question" && error && (
        <div className="text-center">
          <button
            onClick={() => fetchNextQuestion(exchanges)}
            className="bg-black text-white rounded px-4 py-2 font-medium"
          >
            Retry
          </button>
        </div>
      )}
      {phase === "ready-to-answer" && (
        <div className="space-y-3">
          <textarea
            className="w-full border rounded px-3 py-2"
            rows={4}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            autoFocus
          />
          <div className="text-center">
            <button
              onClick={submitAnswer}
              disabled={!answer.trim()}
              className="bg-black text-white rounded px-4 py-2 font-medium disabled:opacity-40"
            >
              Submit answer
            </button>
          </div>
        </div>
      )}
      {phase === "submitting" && (
        <p className="text-center">Submitting your answer...</p>
      )}
    </div>
  );
}
