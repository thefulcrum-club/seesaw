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

type Step = "form" | "intake-choice" | "voice" | "text" | "pipeline" | "report" | "error";

function Wordmark() {
  return (
    <span className="font-serif italic">
      fulcrum<span style={{ color: "var(--brand)" }}>.</span>
    </span>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-border">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-10 text-left">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          © {new Date().getFullYear()} fulcrum. · market research
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
  const [step, setStep] = useState<Step>("form");
  const [researchState, setResearchState] = useState<ResearchState | null>(null);
  const [report, setReport] = useState<MarketResearchReport | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col min-h-full">
      <main className="flex-1 p-8">
        <h1 className="text-4xl text-center mb-4 font-serif italic">
          <Wordmark /> market research
        </h1>
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
