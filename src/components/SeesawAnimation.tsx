// src/components/SeesawAnimation.tsx
"use client";

import { useEffect } from "react";

export function SeesawAnimation({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1600);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-6 animate-step-in">
      <svg
        viewBox="0 0 240 140"
        className="w-64 md:w-80"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* ground line */}
        <line x1="10" y1="120" x2="230" y2="120" stroke="var(--border)" strokeWidth="2" />

        {/* fulcrum triangle */}
        <path d="M120 70 L100 120 L140 120 Z" stroke="var(--brand)" />

        {/* plank + riders pivot together around the fulcrum tip */}
        <g className="seesaw-plank" style={{ transformOrigin: "120px 70px" }}>
          <line x1="30" y1="70" x2="210" y2="70" />
          <circle cx="45" cy="58" r="8" stroke="var(--brand-glow)" />
          <circle cx="195" cy="58" r="8" stroke="var(--brand-glow)" />
        </g>
      </svg>

      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
        balancing the idea
      </p>
    </div>
  );
}
