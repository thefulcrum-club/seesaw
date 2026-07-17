// src/app/page.tsx
"use client";

import { useState } from "react";
import { IdeaForm } from "@/components/IdeaForm";
import { VoiceIntake } from "@/components/VoiceIntake";
import { ReportView } from "@/components/Report/ReportView";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import type { IdeaFormInput, ResearchState, MarketResearchReport, VoiceExchange } from "@/lib/types";

type Step = "form" | "voice" | "pipeline" | "report" | "error";

export default function Home() {
  const [step, setStep] = useState<Step>("form");
  const [researchState, setResearchState] = useState<ResearchState | null>(null);
  const [report, setReport] = useState<MarketResearchReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleFormSubmit(input: IdeaFormInput) {
    setResearchState({ form: input, voiceExchanges: [] });
    setStep("voice");
  }

  async function handleVoiceComplete(exchanges: VoiceExchange[]) {
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
      const data = (await res.json()) as MarketResearchReport;
      setReport(data);
      setStep("report");
    } catch {
      setErrorMessage("Something went wrong generating your report.");
      setStep("error");
    }
  }

  function handleNewResearch() {
    setResearchState(null);
    setReport(null);
    setErrorMessage(null);
    setStep("form");
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-center mb-8">
        Fulcrum Market Research Simulator
      </h1>

      {step === "form" && <IdeaForm onSubmit={handleFormSubmit} />}

      {step === "voice" && researchState && (
        <VoiceIntake
          researchState={researchState}
          onComplete={handleVoiceComplete}
        />
      )}

      {step === "pipeline" && (
        <p className="text-center">
          Researching your idea — this can take a few minutes...
        </p>
      )}

      {step === "error" && (
        <div className="max-w-xl mx-auto text-center space-y-4">
          <p className="text-red-600">{errorMessage}</p>
          <button
            onClick={() => researchState && runPipeline(researchState)}
            className="bg-black text-white rounded px-4 py-2 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {step === "report" && report && (
        <>
          <div className="max-w-3xl mx-auto flex justify-end mb-4">
            <DownloadPdfButton report={report} />
          </div>
          <ReportView report={report} onNewResearch={handleNewResearch} />
        </>
      )}
    </main>
  );
}
