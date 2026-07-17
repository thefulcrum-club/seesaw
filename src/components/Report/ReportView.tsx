// src/components/Report/ReportView.tsx
import type { MarketResearchReport } from "@/lib/types";
import { VerdictBadge } from "./VerdictBadge";
import { SourcesList } from "./SourcesList";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function ReportView({
  report,
  onNewResearch,
}: {
  report: MarketResearchReport;
  onNewResearch: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <VerdictBadge verdict={report.verdict} />

      <Section title="Executive summary">
        <p>{report.executive_summary}</p>
      </Section>

      <Section title="Market size (TAM / SAM / SOM)">
        <p>
          <strong>TAM:</strong> {report.tam_sam_som.tam}
        </p>
        <p>
          <strong>SAM:</strong> {report.tam_sam_som.sam}
        </p>
        <p>
          <strong>SOM:</strong> {report.tam_sam_som.som}
        </p>
        <p className="text-sm text-gray-600">{report.tam_sam_som.methodology}</p>
      </Section>

      <Section title="Competitors">
        <div className="grid gap-4 sm:grid-cols-2">
          {report.competitors.map((c) => (
            <div key={c.name} className="border rounded p-3">
              <p className="font-medium">{c.name}</p>
              <p className="text-sm">{c.description}</p>
              <p className="text-sm text-gray-600">Pricing: {c.pricing}</p>
              <p className="text-sm text-gray-600">Positioning: {c.positioning}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="SWOT">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-medium">Strengths</p>
            <ul className="list-disc list-inside text-sm">
              {report.swot.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Weaknesses</p>
            <ul className="list-disc list-inside text-sm">
              {report.swot.weaknesses.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Opportunities</p>
            <ul className="list-disc list-inside text-sm">
              {report.swot.opportunities.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Threats</p>
            <ul className="list-disc list-inside text-sm">
              {report.swot.threats.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Product-market fit signal">
        <p>{report.pmf_signal.summary}</p>
        <ul className="text-sm space-y-1">
          {report.pmf_signal.evidence.map((e, i) => (
            <li
              key={i}
              className={e.source_url ? "" : "italic text-gray-500"}
            >
              {e.claim}
              {e.source_url && (
                <>
                  {" "}
                  (
                  <a
                    href={e.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    source
                  </a>
                  )
                </>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Economics">
        <p>
          <strong>Pricing model:</strong> {report.economics.pricing_model}
        </p>
        <p>
          <strong>Implied margin:</strong> {report.economics.implied_margin}
        </p>
        <p>
          <strong>Capital target to SOM:</strong>{" "}
          {report.economics.capital_target_to_som}
        </p>
      </Section>

      <Section title="Feasibility">
        <p>
          <strong>Technical:</strong> {report.feasibility.technical}
        </p>
        <p>
          <strong>Regulatory:</strong> {report.feasibility.regulatory}
        </p>
        <p>
          <strong>Go-to-market:</strong> {report.feasibility.go_to_market}
        </p>
        {report.feasibility.geo.applicable && (
          <p>
            <strong>Local market:</strong> {report.feasibility.geo.analysis}
          </p>
        )}
      </Section>

      <Section title="Pros & cons">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-medium">Pros</p>
            <ul className="list-disc list-inside text-sm">
              {report.pros.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Cons</p>
            <ul className="list-disc list-inside text-sm">
              {report.cons.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Sources">
        <SourcesList sources={report.sources} />
      </Section>

      <button
        onClick={onNewResearch}
        className="border rounded px-4 py-2 font-medium"
      >
        New research
      </button>
    </div>
  );
}
