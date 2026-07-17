// src/components/Report/SwotQuadrant.tsx
import type { MarketResearchReport } from "@/lib/types";

function Quadrant({
  emoji,
  title,
  items,
  accent,
}: {
  emoji: string;
  title: string;
  items: string[];
  accent: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p
        className="font-mono text-[11px] uppercase tracking-[0.22em] mb-3"
        style={{ color: accent }}
      >
        {emoji} {title}
      </p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-foreground/90 leading-snug">
            <span
              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SwotQuadrant({ swot }: { swot: MarketResearchReport["swot"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Quadrant emoji="💪" title="Strengths" items={swot.strengths} accent="#34d399" />
      <Quadrant emoji="⚠️" title="Weaknesses" items={swot.weaknesses} accent="#fb7185" />
      <Quadrant
        emoji="🚀"
        title="Opportunities"
        items={swot.opportunities}
        accent="#6187ec"
      />
      <Quadrant emoji="🌩️" title="Threats" items={swot.threats} accent="#fbbf24" />
    </div>
  );
}
