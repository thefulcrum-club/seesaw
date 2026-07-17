// src/components/Report/VerdictGauge.tsx
"use client";

import { useEffect, useState } from "react";
import type { MarketResearchReport } from "@/lib/types";

const NEEDLE_ANGLE: Record<MarketResearchReport["verdict"]["rating"], number> = {
  red: -60,
  amber: 0,
  green: 60,
};

const RATING_LABEL: Record<MarketResearchReport["verdict"]["rating"], string> = {
  red: "🔴 Red — high risk",
  amber: "🟡 Amber — mixed signals",
  green: "🟢 Green — strong signal",
};

export function VerdictGauge({
  verdict,
}: {
  verdict: MarketResearchReport["verdict"];
}) {
  const [angle, setAngle] = useState(-90);

  useEffect(() => {
    const target = NEEDLE_ANGLE[verdict.rating];
    const timer = setTimeout(() => setAngle(target), 100);
    return () => clearTimeout(timer);
  }, [verdict.rating]);

  return (
    <div className="bg-white rounded-3xl border-2 border-purple-100 p-6 text-center">
      <svg viewBox="0 0 200 110" className="mx-auto w-64">
        <path d="M 10 100 A 90 90 0 0 1 76 15" fill="none" stroke="#fca5a5" strokeWidth="18" strokeLinecap="round" />
        <path d="M 76 15 A 90 90 0 0 1 124 15" fill="none" stroke="#fde68a" strokeWidth="18" strokeLinecap="round" />
        <path d="M 124 15 A 90 90 0 0 1 190 100" fill="none" stroke="#86efac" strokeWidth="18" strokeLinecap="round" />
        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: "100px 100px",
            transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <line x1="100" y1="100" x2="100" y2="30" stroke="#7c3aed" strokeWidth="4" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="8" fill="#7c3aed" />
      </svg>
      <p className="text-lg font-bold mt-2">{RATING_LABEL[verdict.rating]}</p>
      <p className="text-gray-600 mt-2 max-w-md mx-auto">{verdict.reasoning}</p>
    </div>
  );
}
