// src/components/Report/CompetitorCard.tsx
"use client";

import { useState } from "react";
import type { MarketResearchReport } from "@/lib/types";

export function CompetitorCard({
  competitor,
}: {
  competitor: MarketResearchReport["competitors"][number];
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className="text-left [perspective:1000px] h-56 w-full"
      aria-label={`Toggle details for ${competitor.name}`}
    >
      <div
        className="relative h-full w-full [transform-style:preserve-3d] transition-transform duration-500"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        <div
          className="absolute inset-0 [backface-visibility:hidden] rounded-3xl border border-border p-4 flex flex-col overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, color-mix(in oklab, var(--brand) 25%, var(--card)) 0%, var(--card) 70%)",
          }}
        >
          <p className="font-serif italic text-lg text-foreground line-clamp-2">
            {competitor.name}
          </p>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-4 flex-1">
            {competitor.description}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand mt-2 shrink-0">
            Click to flip →
          </p>
        </div>
        <div
          className="absolute inset-0 [backface-visibility:hidden] rounded-3xl border border-border p-4 flex flex-col overflow-hidden"
          style={{
            transform: "rotateY(180deg)",
            background:
              "radial-gradient(circle at 70% 80%, color-mix(in oklab, var(--brand) 25%, var(--card)) 0%, var(--card) 70%)",
          }}
        >
          <p className="font-mono text-[10px] font-bold text-brand uppercase tracking-[0.18em] shrink-0">
            Pricing
          </p>
          <p className="text-sm text-foreground/90 mb-2 line-clamp-2">{competitor.pricing}</p>
          <p className="font-mono text-[10px] font-bold text-brand uppercase tracking-[0.18em] shrink-0">
            Positioning
          </p>
          <p className="text-sm text-foreground/90 line-clamp-3">{competitor.positioning}</p>
        </div>
      </div>
    </button>
  );
}
