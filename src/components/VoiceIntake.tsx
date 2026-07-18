// src/components/VoiceIntake.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { backendUrl } from "@/lib/backend";
import type { ResearchState, VoiceExchange } from "@/lib/types";
import { transcribeAudio } from "@/lib/whisperClient";
import { synthesizeSpeech } from "@/lib/kokoroClient";

type Phase =
  | "loading-question"
  | "speaking"
  | "ready-to-record"
  | "recording"
  | "transcribing";

function speakWithBrowserTTS(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

async function speak(text: string): Promise<void> {
  try {
    const blob = await synthesizeSpeech(text);
    const objectUrl = URL.createObjectURL(blob);
    await new Promise<void>((resolve) => {
      const audio = new Audio(objectUrl);
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.warn("Kokoro TTS failed, falling back to browser speech synthesis", err);
    await speakWithBrowserTTS(text);
  }
}

export function VoiceIntake({
  researchState,
  onComplete,
}: {
  researchState: ResearchState;
  onComplete: (exchanges: VoiceExchange[]) => void;
}) {
  const [exchanges, setExchanges] = useState<VoiceExchange[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading-question");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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
      setPhase("speaking");
      await speak(data.question);
      setPhase("ready-to-record");
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

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.start();
      mediaRecorderRef.current = recorder;
      setPhase("recording");
    } catch {
      setError("Microphone access failed. Please allow microphone permissions and retry.");
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !currentQuestion) return;

    setPhase("transcribing");
    recorder.stop();
    recorder.onstop = async () => {
      try {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const text = await transcribeAudio(blob);
        const newExchanges = [
          ...exchanges,
          { question: currentQuestion, answerTranscript: text },
        ];
        setExchanges(newExchanges);
        await fetchNextQuestion(newExchanges);
      } catch {
        setError("Transcription failed. Please retry this question.");
        setPhase("ready-to-record");
      }
    };
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 text-center">
      <p className="text-sm text-gray-500">
        Question {exchanges.length + 1} of ~6-8
      </p>
      {phase === "loading-question" && !error && <p>Thinking of the next question...</p>}
      {phase === "speaking" && <p className="text-sm text-gray-500">Speaking...</p>}
      {phase !== "loading-question" && currentQuestion && (
        <p className="text-lg font-medium">{currentQuestion}</p>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {phase === "loading-question" && error && (
        <button
          onClick={() => fetchNextQuestion(exchanges)}
          className="bg-black text-white rounded px-4 py-2 font-medium"
        >
          Retry
        </button>
      )}
      {phase === "ready-to-record" && (
        <button
          onClick={startRecording}
          className="bg-black text-white rounded px-4 py-2 font-medium"
        >
          Start recording
        </button>
      )}
      {phase === "recording" && (
        <button
          onClick={stopRecording}
          className="bg-red-600 text-white rounded px-4 py-2 font-medium"
        >
          Stop recording
        </button>
      )}
      {phase === "transcribing" && <p>Transcribing your answer...</p>}
    </div>
  );
}
