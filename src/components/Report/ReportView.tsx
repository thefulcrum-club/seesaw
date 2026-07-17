// src/components/Report/ReportView.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { MarketResearchReport } from "@/lib/types";
import { VerdictGauge } from "./VerdictGauge";
import { TamSamSomChart } from "./TamSamSomChart";
import { SwotQuadrant } from "./SwotQuadrant";
import { CompetitorCard } from "./CompetitorCard";
import { PmfEvidenceList } from "./PmfEvidenceList";
import { SourcesList } from "./SourcesList";
import { DownloadPdfButton } from "../DownloadPdfButton";
import { fireConfetti } from "@/lib/confetti";

type Tab = "overview" | "market" | "swot" | "competitors" | "pmf-sources";

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: "overview", label: "Overview", emoji: "🏠" },
  { key: "market", label: "Market", emoji: "📊" },
  { key: "swot", label: "SWOT", emoji: "🧭" },
  { key: "competitors", label: "Competitors", emoji: "⚔️" },
  { key: "pmf-sources", label: "PMF & Sources", emoji: "🔍" },
];

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
      {children}
    </div>
  );
}

export function ReportView({
  report,
  onNewResearch,
}: {
  report: MarketResearchReport;
  onNewResearch: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const firedConfetti = useRef(false);

  useEffect(() => {
    if (report.verdict.rating === "green" && !firedConfetti.current) {
      firedConfetti.current = true;
      fireConfetti();
    }
  }, [report.verdict.rating]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex flex-wrap justify-center gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-violet-600 text-white"
                : "bg-violet-50 text-violet-700 hover:bg-violet-100"
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <DownloadPdfButton report={report} />
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <VerdictGauge verdict={report.verdict} />

          <Card>
            <p className="font-bold mb-2">📝 Executive summary</p>
            <p className="text-sm text-gray-700">{report.executive_summary}</p>
          </Card>

          <Card>
            <p className="font-bold mb-2">💰 Economics</p>
            <p className="text-sm">
              <strong>Pricing model:</strong> {report.economics.pricing_model}
            </p>
            <p className="text-sm">
              <strong>Implied margin:</strong> {report.economics.implied_margin}
            </p>
            <p className="text-sm">
              <strong>Capital target to SOM:</strong>{" "}
              {report.economics.capital_target_to_som}
            </p>
          </Card>

          <Card>
            <p className="font-bold mb-2">🏗️ Feasibility</p>
            <p className="text-sm">
              <strong>Technical:</strong> {report.feasibility.technical}
            </p>
            <p className="text-sm">
              <strong>Regulatory:</strong> {report.feasibility.regulatory}
            </p>
            <p className="text-sm">
              <strong>Go-to-market:</strong> {report.feasibility.go_to_market}
            </p>
            {report.feasibility.geo.applicable && (
              <p className="text-sm">
                <strong>Local market:</strong> {report.feasibility.geo.analysis}
              </p>
            )}
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-green-50 rounded-3xl border-2 border-green-200 p-5">
              <p className="font-bold mb-2">✅ Pros</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {report.pros.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 rounded-3xl border-2 border-red-200 p-5">
              <p className="font-bold mb-2">❌ Cons</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {report.cons.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === "market" && (
        <TamSamSomChart tamSamSom={report.tam_sam_som} />
      )}

      {activeTab === "swot" && <SwotQuadrant swot={report.swot} />}

      {activeTab === "competitors" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {report.competitors.map((c) => (
            <CompetitorCard key={c.name} competitor={c} />
          ))}
        </div>
      )}

      {activeTab === "pmf-sources" && (
        <div className="space-y-6">
          <PmfEvidenceList pmfSignal={report.pmf_signal} />
          <Card>
            <p className="font-bold mb-2">🔗 Sources</p>
            <SourcesList sources={report.sources} />
          </Card>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={onNewResearch}
          className="border-2 border-violet-200 text-violet-700 rounded-full px-6 py-2 font-medium hover:bg-violet-50"
        >
          🔄 New research
        </button>
      </div>
    </div>
  );
}
