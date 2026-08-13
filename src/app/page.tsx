// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { IdeaForm } from "@/components/IdeaForm";
import { VoiceIntake } from "@/components/VoiceIntake";
import { TextIntake } from "@/components/TextIntake";
import { ReportView } from "@/components/Report/ReportView";
import { PipelineProgress } from "@/components/PipelineProgress";
import { SeesawAnimation } from "@/components/SeesawAnimation";
import { AboutSection } from "@/components/AboutSection";
import { PipelineStagesSection } from "@/components/PipelineStagesSection";
import { ClosingCta } from "@/components/ClosingCta";
import { EmailGate } from "@/components/EmailGate";
import { backendUrl } from "@/lib/backend";
import { getStoredEmail, identifyWithEmail } from "@/lib/email";
import { captureReferralCodeFromUrl, getStoredReferralCode } from "@/lib/referral";
import type {
  IdeaFormInput,
  ResearchState,
  MarketResearchReport,
  MarketResearchReportResponse,
  VoiceExchange,
} from "@/lib/types";

type Step =
  | "landing"
  | "email"
  | "transition"
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

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center px-6">
      <div className="animate-rise-in delay-1 mb-8 inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: "var(--brand)", animation: "pulse-dot 2s ease-in-out infinite" }}
        />
        an intelligence layer for founders
      </div>

      <h1 className="font-serif leading-[0.92] tracking-tight text-balance">
        <span className="animate-rise-in delay-2 block text-[clamp(1.5rem,4vw,2.75rem)] font-medium">
          market simulation, before you build.
        </span>
        <span className="animate-rise-in delay-3 block text-[clamp(4rem,14vw,11rem)] italic mt-2">
          <Wordmark />
        </span>
      </h1>

      <p className="animate-rise-in delay-4 mt-8 max-w-xl font-serif text-lg leading-relaxed text-muted-foreground md:text-xl">
        Seesaw stress-tests your idea — market size, competitors, PMF signal, and a
        straight verdict — before you spend six figures finding out the hard way.
      </p>

      <button
        onClick={onStart}
        className="animate-rise-in delay-5 mt-12 inline-flex items-center gap-2 rounded-full px-8 py-4 font-mono text-[12px] uppercase tracking-[0.22em] text-white transition-transform hover:-translate-y-0.5"
        style={{ backgroundColor: "var(--brand)", boxShadow: "0 20px 60px -15px var(--brand)" }}
      >
        Simulate your idea <span>→</span>
      </button>

      <Link
        href="/sample"
        className="animate-rise-in delay-5 mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-brand transition-colors"
      >
        See a sample report →
      </Link>

      <p className="animate-rise-in delay-5 mt-8 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
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
  const [researchState, setResearchState] = useState<ResearchState | null>(null);
  const [report, setReport] = useState<MarketResearchReport | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    captureReferralCodeFromUrl();
    const email = getStoredEmail();
    if (email) identifyWithEmail(email);
  }, []);

  function handleStart() {
    const hasStoredEmail = Boolean(getStoredEmail());
    posthog.capture("simulation_started", { has_stored_email: hasStoredEmail });
    const nextStep: Step = hasStoredEmail ? "transition" : "email";
    const alreadyAtTop = window.scrollY < 4;
    if (alreadyAtTop) {
      setStep(nextStep);
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    const onScrollEnd = () => {
      window.removeEventListener("scrollend", onScrollEnd);
      setStep(nextStep);
    };
    if ("onscrollend" in window) {
      window.addEventListener("scrollend", onScrollEnd, { once: true });
    } else {
      setTimeout(() => setStep(nextStep), 600);
    }
  }

  function handleEmailSubmitted() {
    setStep("transition");
  }

  function handleTransitionDone() {
    setStep("form");
  }

  function handleFormSubmit(input: IdeaFormInput) {
    posthog.capture("idea_details_completed", { industry: input.industry });
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
    posthog.capture("research_generation_started", {
      intake_method: step === "voice" ? "voice" : "text",
      answer_count: state.voiceExchanges.length,
    });
    try {
      const res = await fetch(backendUrl("/research"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchState: state,
          email: getStoredEmail(),
          referralCode: getStoredReferralCode(),
        }),
      });
      if (!res.ok) throw new Error("Pipeline request failed");
      const { sessionId, ...data } = (await res.json()) as MarketResearchReportResponse;
      posthog.capture("research_generation_completed", {
        verdict_rating: data.verdict.rating,
        answer_count: state.voiceExchanges.length,
      });
      setReport(data);
      setSessionId(sessionId);
      setStep("report");
    } catch {
      posthog.capture("research_generation_failed", {
        answer_count: state.voiceExchanges.length,
      });
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
        <main className="flex-1">
          <div className="flex items-center justify-center p-8">
            <Landing onStart={handleStart} />
          </div>

          <AboutSection />
          <PipelineStagesSection />
          <ClosingCta onStart={handleStart} />
        </main>
        <Footer />
      </div>
    );
  }

  if (step === "email") {
    return (
      <div className="flex flex-col min-h-full">
        <main className="flex-1 flex items-center justify-center p-8">
          <EmailGate onSubmit={handleEmailSubmitted} />
        </main>
        <Footer />
      </div>
    );
  }

  if (step === "transition") {
    return (
      <div className="flex flex-col min-h-full">
        <main className="flex-1 flex items-center justify-center p-8">
          <SeesawAnimation onDone={handleTransitionDone} />
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
                onClick={() => {
                  posthog.capture("intake_method_selected", { intake_method: "voice" });
                  setStep("voice");
                }}
                className="rounded-full px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white transition-transform hover:-translate-y-0.5"
                style={{
                  backgroundColor: "var(--brand)",
                  boxShadow: "0 10px 30px -10px var(--brand)",
                }}
              >
                Voice
              </button>
              <button
                onClick={() => {
                  posthog.capture("intake_method_selected", { intake_method: "text" });
                  setStep("text");
                }}
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

        {step === "pipeline" && <PipelineProgress />}

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
