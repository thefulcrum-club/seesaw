// src/app/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { IdeaForm } from "@/components/IdeaForm";
import { VoiceIntake } from "@/components/VoiceIntake";
import { TextIntake } from "@/components/TextIntake";
import { ReportView } from "@/components/Report/ReportView";
import type {
  IdeaFormInput,
  ResearchState,
  MarketResearchReport,
  MarketResearchReportResponse,
  VoiceExchange,
} from "@/lib/types";

type Step =
  | "landing"
  | "form"
  | "intake-choice"
  | "voice"
  | "text"
  | "pipeline"
  | "report"
  | "error";

function Wordmark() {
  return (
    <span className="font-serif italic">
      seesaw<span style={{ color: "var(--brand)" }}>.</span>
    </span>
  );
}

function Landing({
  onStart,
  leaving,
}: {
  onStart: () => void;
  leaving: boolean;
}) {
  return (
    <div
      className={`flex min-h-[80vh] flex-col items-center justify-center text-center px-6 ${
        leaving ? "animate-hero-out" : "animate-step-in"
      }`}
    >
      <div className="mb-8 inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: "var(--brand)", animation: "pulse-dot 2s ease-in-out infinite" }}
        />
        an intelligence layer for founders
      </div>

      <h1 className="font-serif leading-[0.92] tracking-tight text-balance">
        <span className="block text-[clamp(1.5rem,4vw,2.75rem)] font-medium">
          market simulation, before you build.
        </span>
        <span className="block text-[clamp(4rem,14vw,11rem)] italic mt-2">
          <Wordmark />
        </span>
      </h1>

      <p className="mt-8 max-w-xl font-serif text-lg leading-relaxed text-muted-foreground md:text-xl">
        Seesaw stress-tests your idea — market size, competitors, PMF signal, and a
        straight verdict — before you spend six figures finding out the hard way.
      </p>

      <button
        onClick={onStart}
        className="mt-12 inline-flex items-center gap-2 rounded-full px-8 py-4 font-mono text-[12px] uppercase tracking-[0.22em] text-white transition-transform hover:-translate-y-0.5"
        style={{ backgroundColor: "var(--brand)", boxShadow: "0 20px 60px -15px var(--brand)" }}
      >
        Simulate your idea <span>→</span>
      </button>

      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        by fulcrum.
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-border">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-10 text-left">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          © {new Date().getFullYear()} seesaw by fulcrum. · market research
        </p>
      </div>
      <div className="select-none overflow-hidden px-6">
        <div
          className="font-serif italic leading-[0.85] tracking-tight text-foreground text-left"
          style={{ fontSize: "clamp(5rem, 22vw, 22rem)" }}
        >
          fulcrum<span style={{ color: "var(--brand)" }}>.</span>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>("landing");
  const [leavingLanding, setLeavingLanding] = useState(false);
  const [researchState, setResearchState] = useState<ResearchState | null>(null);
  const [report, setReport] = useState<MarketResearchReport | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleStart() {
    setLeavingLanding(true);
    setTimeout(() => {
      setStep("form");
      setLeavingLanding(false);
    }, 380);
  }

  function handleFormSubmit(input: IdeaFormInput) {
    setResearchState({ form: input, voiceExchanges: [] });
    setStep("intake-choice");
  }

  async function handleIntakeComplete(exchanges: VoiceExchange[]) {
    if (!researchState) return;
    const updatedState = { ...researchState, voiceExchanges: exchanges };
    setResearchState(updatedState);
    setStep("pipeline");
    await runPipeline(updatedState);
  }

  async function runPipeline(state: ResearchState) {
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researchState: state }),
      });
      if (!res.ok) throw new Error("Pipeline request failed");
      const { sessionId, ...data } = (await res.json()) as MarketResearchReportResponse;
      setReport(data);
      setSessionId(sessionId);
      setStep("report");
    } catch {
      setErrorMessage("Something went wrong generating your report.");
      setStep("error");
    }
  }

  function handleNewResearch() {
    setResearchState(null);
    setReport(null);
    setSessionId(null);
    setErrorMessage(null);
    setStep("form");
  }

  if (step === "landing") {
    return (
      <div className="flex flex-col min-h-full">
        <main className="flex-1 flex items-center justify-center p-8">
          <Landing onStart={handleStart} leaving={leavingLanding} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <main className="flex-1 p-8">
        <h1 className="text-4xl text-center mb-1 font-serif italic">
          <Wordmark /> market research
        </h1>
        <p className="text-center mb-4 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          by fulcrum.
        </p>
        <p className="text-center mb-10">
          <Link
            href="/sessions"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-brand transition-colors"
          >
            View past research →
          </Link>
        </p>

        {step === "form" && <IdeaForm onSubmit={handleFormSubmit} />}

        {step === "intake-choice" && (
          <div className="max-w-xl mx-auto text-center space-y-4">
            <p className="text-muted-foreground font-serif text-lg">
              How would you like to answer a few quick follow-up questions?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setStep("voice")}
                className="rounded-full px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white transition-transform hover:-translate-y-0.5"
                style={{
                  backgroundColor: "var(--brand)",
                  boxShadow: "0 10px 30px -10px var(--brand)",
                }}
              >
                Voice
              </button>
              <button
                onClick={() => setStep("text")}
                className="border border-border rounded-full px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground hover:border-brand transition-colors"
              >
                Text
              </button>
            </div>
          </div>
        )}

        {step === "voice" && researchState && (
          <VoiceIntake
            researchState={researchState}
            onComplete={handleIntakeComplete}
          />
        )}

        {step === "text" && researchState && (
          <TextIntake
            researchState={researchState}
            onComplete={handleIntakeComplete}
          />
        )}

        {step === "pipeline" && (
          <p className="text-center font-serif italic text-lg text-muted-foreground">
            Researching your idea — this can take a few minutes...
          </p>
        )}

        {step === "error" && (
          <div className="max-w-xl mx-auto text-center space-y-4">
            <p className="text-rose-400 font-serif">{errorMessage}</p>
            <button
              onClick={() => researchState && runPipeline(researchState)}
              className="rounded-full px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white"
              style={{ backgroundColor: "var(--brand)" }}
            >
              Retry
            </button>
          </div>
        )}

        {step === "report" && report && (
          <ReportView
            report={report}
            sessionId={sessionId}
            onNewResearch={handleNewResearch}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
