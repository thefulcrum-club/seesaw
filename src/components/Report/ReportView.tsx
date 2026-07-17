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
import { IdeateChat } from "./IdeateChat";
import { DownloadPdfButton } from "../DownloadPdfButton";
import { fireConfetti } from "@/lib/confetti";

type Tab = "overview" | "market" | "swot" | "competitors" | "pmf-sources" | "ideate";

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: "overview", label: "Overview", emoji: "🏠" },
  { key: "market", label: "Market", emoji: "📊" },
  { key: "swot", label: "SWOT", emoji: "🧭" },
  { key: "competitors", label: "Competitors", emoji: "⚔️" },
  { key: "pmf-sources", label: "PMF & Sources", emoji: "🔍" },
  { key: "ideate", label: "Ideate", emoji: "💡" },
];

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-3xl border border-border p-6">
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brand mb-3">
      {children}
    </p>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-foreground/90 leading-snug">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function StatBlock({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
        {label}
      </p>
      <BulletList items={items} />
    </div>
  );
}

export function ReportView({
  report,
  sessionId,
  onNewResearch,
}: {
  report: MarketResearchReport;
  sessionId: string | null;
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
    <div className="max-w-4xl mx-auto space-y-6 pb-16 pt-10 px-6">
      <div className="flex flex-wrap justify-center gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
              activeTab === tab.key
                ? "text-white"
                : "bg-card text-muted-foreground border border-border hover:text-foreground"
            }`}
            style={
              activeTab === tab.key
                ? {
                    backgroundColor: "var(--brand)",
                    boxShadow: "0 10px 30px -10px var(--brand)",
                  }
                : undefined
            }
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
            <SectionLabel>📝 Executive summary</SectionLabel>
            <BulletList items={report.executive_summary} />
          </Card>

          <Card>
            <SectionLabel>💰 Economics</SectionLabel>
            <div className="grid gap-5 sm:grid-cols-3">
              <StatBlock label="Pricing model" items={report.economics.pricing_model} />
              <StatBlock label="Implied margin" items={report.economics.implied_margin} />
              <StatBlock
                label="Capital target to SOM"
                items={report.economics.capital_target_to_som}
              />
            </div>
          </Card>

          <Card>
            <SectionLabel>🏗️ Feasibility</SectionLabel>
            <div className="grid gap-5 sm:grid-cols-3">
              <StatBlock label="Technical" items={report.feasibility.technical} />
              <StatBlock label="Regulatory" items={report.feasibility.regulatory} />
              <StatBlock label="Go-to-market" items={report.feasibility.go_to_market} />
            </div>
            {report.feasibility.geo.applicable && report.feasibility.geo.analysis && (
              <div className="mt-5 pt-5 border-t border-border">
                <StatBlock label="Local market" items={report.feasibility.geo.analysis} />
              </div>
            )}
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-card rounded-3xl border border-border p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-400 mb-3">
                ✅ Pros
              </p>
              <BulletList items={report.pros} />
            </div>
            <div className="bg-card rounded-3xl border border-border p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-rose-400 mb-3">
                ❌ Cons
              </p>
              <BulletList items={report.cons} />
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
            <SectionLabel>🔗 Sources</SectionLabel>
            <SourcesList sources={report.sources} />
          </Card>
        </div>
      )}

      {activeTab === "ideate" && (
        <IdeateChat report={report} sessionId={sessionId} />
      )}

      <div className="text-center">
        <button
          onClick={onNewResearch}
          className="border border-border text-muted-foreground rounded-full px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] hover:text-foreground hover:border-brand transition-colors"
        >
          🔄 New research
        </button>
      </div>
    </div>
  );
}
