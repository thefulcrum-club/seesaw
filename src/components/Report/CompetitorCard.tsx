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
      className="text-left [perspective:1000px] h-40 w-full"
      aria-label={`Toggle details for ${competitor.name}`}
    >
      <div
        className="relative h-full w-full [transform-style:preserve-3d] transition-transform duration-500"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        <div className="absolute inset-0 [backface-visibility:hidden] bg-gradient-to-br from-violet-100 to-pink-100 rounded-3xl border-2 border-violet-200 p-4 flex flex-col justify-center">
          <p className="font-bold text-lg">{competitor.name}</p>
          <p className="text-sm text-gray-700 mt-1">{competitor.description}</p>
          <p className="text-xs text-violet-600 mt-2">Click to flip →</p>
        </div>
        <div
          className="absolute inset-0 [backface-visibility:hidden] bg-gradient-to-br from-blue-100 to-cyan-100 rounded-3xl border-2 border-blue-200 p-4 flex flex-col justify-center"
          style={{ transform: "rotateY(180deg)" }}
        >
          <p className="text-xs font-bold text-blue-700 uppercase">Pricing</p>
          <p className="text-sm text-gray-700 mb-2">{competitor.pricing}</p>
          <p className="text-xs font-bold text-blue-700 uppercase">Positioning</p>
          <p className="text-sm text-gray-700">{competitor.positioning}</p>
        </div>
      </div>
    </button>
  );
}
