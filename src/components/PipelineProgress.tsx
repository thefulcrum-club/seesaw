// src/components/PipelineProgress.tsx
"use client";

import { useEffect, useState } from "react";
import { STAGES } from "@/lib/stages";

// Roughly parallel-feeling for the first four (concurrent agents server-side),
// then slower/sequential for economics + synthesis. Purely a visual pace, not
// tied to real backend timing.
const STAGE_DURATIONS_MS = [9000, 9000, 9000, 9000, 20000, 25000];

export function PipelineProgress() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= STAGES.length - 1) return;
    const timer = setTimeout(() => {
      setActiveIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, STAGE_DURATIONS_MS[activeIndex]);
    return () => clearTimeout(timer);
  }, [activeIndex]);

  return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-center mb-6">
        <svg viewBox="0 0 24 18" className="w-10 h-8" fill="none" stroke="var(--brand-glow)" strokeWidth="1.8" strokeLinecap="round">
          <line x1="1" y1="17" x2="23" y2="17" stroke="var(--border)" strokeWidth="1.4" />
          <path d="M12 9 L9 17 L15 17 Z" stroke="var(--brand)" />
          <g className="mini-seesaw-plank">
            <line x1="3" y1="9" x2="21" y2="9" />
            <circle cx="5" cy="6" r="1.6" />
            <circle cx="19" cy="6" r="1.6" />
          </g>
        </svg>
      </div>
      <p className="text-center font-serif italic text-lg text-muted-foreground mb-8">
        Researching your idea — this can take a few minutes...
      </p>
      <ul className="space-y-4">
        {STAGES.map((stage, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <li key={stage} className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
                {isActive ? (
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: "var(--brand)",
                      animation: "pulse-dot 2s ease-in-out infinite",
                    }}
                  />
                ) : isDone ? (
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: "var(--brand)", opacity: 0.4 }}
                  />
                ) : (
                  <span className="inline-block h-1.5 w-1.5 rounded-full border border-border" />
                )}
              </span>
              <span
                className={`font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  isActive
                    ? "text-brand"
                    : isDone
                      ? "text-muted-foreground line-through opacity-60"
                      : "text-muted-foreground"
                }`}
                style={isActive ? { color: "var(--brand)" } : undefined}
              >
                {stage}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
