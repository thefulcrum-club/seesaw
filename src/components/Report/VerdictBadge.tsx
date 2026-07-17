// src/components/Report/VerdictBadge.tsx
import type { MarketResearchReport } from "@/lib/types";

const COLORS: Record<string, string> = {
  green: "bg-green-100 text-green-800 border-green-400",
  amber: "bg-amber-100 text-amber-800 border-amber-400",
  red: "bg-red-100 text-red-800 border-red-400",
};

export function VerdictBadge({
  verdict,
}: {
  verdict: MarketResearchReport["verdict"];
}) {
  return (
    <div className={`border rounded-lg p-4 ${COLORS[verdict.rating]}`}>
      <p className="uppercase text-xs font-bold tracking-wide">
        Verdict: {verdict.rating}
      </p>
      <p className="mt-1">{verdict.reasoning}</p>
    </div>
  );
}
