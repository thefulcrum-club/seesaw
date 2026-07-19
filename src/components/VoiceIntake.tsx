// src/components/VoiceIntake.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { backendUrl } from "@/lib/backend";
import type { ResearchState, VoiceExchange } from "@/lib/types";
import { transcribeAudio } from "@/lib/whisperClient";
import { synthesizeSpeech } from "@/lib/ttsClient";

type Phase =
  | "loading-question"
  | "speaking"
  | "get-ready"
  | "listening"
  | "transcribing"
  | "no-speech-timeout";

// --- Tunable constants -----------------------------------------------------
// Amplitude (0-255, from AnalyserNode byte time-domain data deviation) above
// which we consider the user to be actively speaking.
const SILENCE_AMPLITUDE_THRESHOLD = 4;
// How long continuous silence must persist after speech has begun before we
// auto-stop the recording and move to transcription.
const SILENCE_HOLD_MS = 1800;
// Brief "get ready" buffer between the question finishing and the mic
// actually starting to listen, so the user isn't caught off guard.
const GET_READY_MS = 1500;
// If no speech is detected at all for this long while listening, show the
// "still there?" fallback instead of waiting forever for silence-after-speech.
const NO_SPEECH_TIMEOUT_MS = 20000;
// How often we poll the analyser for amplitude.
const LEVEL_POLL_MS = 100;

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
    console.warn("TTS failed, falling back to browser speech synthesis", err);
    await speakWithBrowserTTS(text);
  }
}

const STATUS_LABEL: Record<Phase, string> = {
  "loading-question": "thinking...",
  speaking: "speaking...",
  "get-ready": "get ready...",
  listening: "listening...",
  transcribing: "transcribing...",
  "no-speech-timeout": "still there?",
};

export function VoiceIntake({
  researchState,
  onComplete,
}: {
  researchState: ResearchState;
  onComplete: (exchanges: VoiceExchange[]) => void;
}) {
  const [exchanges, setExchanges] = useState<VoiceExchange[]>([]);
  const exchangesRef = useRef<VoiceExchange[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading-question");
  const [error, setError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechDetectedRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);
  const noSpeechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getReadyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppingRef = useRef(false);

  const cleanupAudioResources = useCallback(() => {
    if (levelIntervalRef.current !== null) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }
    if (noSpeechTimeoutRef.current !== null) {
      clearTimeout(noSpeechTimeoutRef.current);
      noSpeechTimeoutRef.current = null;
    }
    if (getReadyTimeoutRef.current !== null) {
      clearTimeout(getReadyTimeoutRef.current);
      getReadyTimeoutRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // already stopped
      }
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMicLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudioResources();
    };
  }, [cleanupAudioResources]);

  async function fetchNextQuestion(exchangesSoFar: VoiceExchange[]) {
    cleanupAudioResources();
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
      beginGetReady();
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

  function beginGetReady() {
    setPhase("get-ready");
    getReadyTimeoutRef.current = setTimeout(() => {
      getReadyTimeoutRef.current = null;
      startListening();
    }, GET_READY_MS);
  }

  async function startListening() {
    setError(null);
    stoppingRef.current = false;
    speechDetectedRef.current = false;
    silenceStartRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.start();
      mediaRecorderRef.current = recorder;

      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.fftSize);

      setPhase("listening");

      noSpeechTimeoutRef.current = setTimeout(() => {
        if (!speechDetectedRef.current) {
          cleanupAudioResources();
          setPhase("no-speech-timeout");
        }
      }, NO_SPEECH_TIMEOUT_MS);

      levelIntervalRef.current = setInterval(() => {
        const currentAnalyser = analyserRef.current;
        if (!currentAnalyser) return;
        currentAnalyser.getByteTimeDomainData(dataArray);

        // Compute RMS deviation from the 128 (silence) midpoint.
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const deviation = dataArray[i] - 128;
          sumSquares += deviation * deviation;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        setMicLevel(rms);

        if (rms > SILENCE_AMPLITUDE_THRESHOLD) {
          speechDetectedRef.current = true;
          silenceStartRef.current = null;
          if (noSpeechTimeoutRef.current !== null) {
            clearTimeout(noSpeechTimeoutRef.current);
            noSpeechTimeoutRef.current = null;
          }
        } else if (speechDetectedRef.current) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current >= SILENCE_HOLD_MS) {
            stopListening();
          }
        }
      }, LEVEL_POLL_MS);
    } catch {
      setError("Microphone access failed. Please allow microphone permissions and retry.");
    }
  }

  async function stopListening() {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    if (levelIntervalRef.current !== null) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }
    if (noSpeechTimeoutRef.current !== null) {
      clearTimeout(noSpeechTimeoutRef.current);
      noSpeechTimeoutRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    const question = currentQuestion;
    if (!recorder || !question) {
      stoppingRef.current = false;
      cleanupAudioResources();
      setError("Something went wrong. Please retry.");
      setPhase("get-ready");
      return;
    }

    setPhase("transcribing");
    setMicLevel(0);

    recorder.onstop = async () => {
      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      analyserRef.current = null;

      try {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const text = await transcribeAudio(blob);
        const newExchanges = [
          ...exchangesRef.current,
          { question, answerTranscript: text },
        ];
        exchangesRef.current = newExchanges;
        setExchanges(newExchanges);
        await fetchNextQuestion(newExchanges);
      } catch {
        setError("Transcription failed. Please retry this question.");
        stoppingRef.current = false;
        setPhase("get-ready");
        beginGetReady();
      }
    };

    if (recorder.state !== "inactive") {
      recorder.stop();
    } else {
      recorder.onstop(new Event("stop"));
    }
  }

  const isOrbActive = phase === "speaking" || phase === "listening";
  const orbScale =
    phase === "listening"
      ? 1 + Math.min(micLevel / 60, 0.35)
      : 1;

  return (
    <div className="max-w-xl mx-auto space-y-6 text-center animate-step-in">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Question {exchanges.length + 1} of ~6-8
      </p>

      <div className="flex flex-col items-center justify-center py-8">
        <div className="relative flex h-40 w-40 items-center justify-center">
          {/* Listening level ring, driven by real mic amplitude */}
          {phase === "listening" && (
            <div
              className="absolute rounded-full"
              style={{
                inset: `-${Math.min(micLevel * 0.9, 28)}px`,
                border: "1px solid var(--brand-glow)",
                opacity: Math.min(0.15 + micLevel / 90, 0.6),
                transition: "inset 90ms linear, opacity 90ms linear",
              }}
            />
          )}
          <div
            className="relative h-28 w-28 rounded-full"
            style={{
              backgroundColor: "var(--brand)",
              boxShadow: isOrbActive
                ? "0 0 60px -5px var(--brand-glow)"
                : "0 0 30px -10px var(--brand)",
              opacity: phase === "loading-question" || phase === "transcribing" ? 0.4 : 1,
              transform: `scale(${orbScale})`,
              transition: "transform 90ms linear, opacity 300ms ease, box-shadow 300ms ease",
              animation: phase === "speaking" ? "pulse-dot 1.4s ease-in-out infinite" : undefined,
            }}
          />
        </div>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {STATUS_LABEL[phase]}
        </p>
      </div>

      {currentQuestion && phase !== "loading-question" && (
        <p className="font-serif text-lg leading-relaxed">{currentQuestion}</p>
      )}

      {error && <p className="text-rose-400 font-serif text-sm">{error}</p>}

      {phase === "loading-question" && error && (
        <button
          onClick={() => fetchNextQuestion(exchanges)}
          className="rounded-full px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: "var(--brand)", boxShadow: "0 10px 30px -10px var(--brand)" }}
        >
          Retry
        </button>
      )}

      {phase === "listening" && (
        <button
          onClick={stopListening}
          className="border border-border rounded-full px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground hover:border-brand transition-colors"
        >
          I&apos;m done
        </button>
      )}

      {phase === "no-speech-timeout" && (
        <div className="space-y-3">
          <p className="font-serif text-sm text-muted-foreground">
            Still there? Tap to continue.
          </p>
          <button
            onClick={() => beginGetReady()}
            className="rounded-full px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: "var(--brand)", boxShadow: "0 10px 30px -10px var(--brand)" }}
          >
            Continue
          </button>
        </div>
      )}

      {error && phase !== "loading-question" && (
        <button
          onClick={() => {
            setError(null);
            beginGetReady();
          }}
          className="rounded-full px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: "var(--brand)", boxShadow: "0 10px 30px -10px var(--brand)" }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
