// src/components/Report/SwotQuadrant.tsx
import type { MarketResearchReport } from "@/lib/types";

function Quadrant({
  emoji,
  title,
  items,
  bg,
  border,
}: {
  emoji: string;
  title: string;
  items: string[];
  bg: string;
  border: string;
}) {
  return (
    <div className={`rounded-3xl border-2 ${border} ${bg} p-5`}>
      <p className="font-bold mb-2">
        {emoji} {title}
      </p>
      <ul className="text-sm space-y-1 list-disc list-inside">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function SwotQuadrant({ swot }: { swot: MarketResearchReport["swot"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Quadrant
        emoji="💪"
        title="Strengths"
        items={swot.strengths}
        bg="bg-green-50"
        border="border-green-200"
      />
      <Quadrant
        emoji="⚠️"
        title="Weaknesses"
        items={swot.weaknesses}
        bg="bg-red-50"
        border="border-red-200"
      />
      <Quadrant
        emoji="🚀"
        title="Opportunities"
        items={swot.opportunities}
        bg="bg-blue-50"
        border="border-blue-200"
      />
      <Quadrant
        emoji="🌩️"
        title="Threats"
        items={swot.threats}
        bg="bg-amber-50"
        border="border-amber-200"
      />
    </div>
  );
}
