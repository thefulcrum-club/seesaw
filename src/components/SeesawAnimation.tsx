// src/components/SeesawAnimation.tsx
"use client";

import { useEffect } from "react";

export function SeesawAnimation({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-6 min-h-[70vh] animate-step-in">
      <svg
        viewBox="0 0 240 150"
        className="w-72 md:w-96"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* grass / ground */}
        <line x1="6" y1="128" x2="234" y2="128" stroke="var(--border)" strokeWidth="2" />
        {[18, 30, 42, 198, 210, 222].map((x, i) => (
          <path
            key={x}
            d={`M${x} 128 q ${i % 2 === 0 ? 3 : -3} -8 0 -14`}
            stroke="var(--border)"
            strokeWidth="2"
          />
        ))}

        {/* fulcrum base, squashes slightly on each landing */}
        <g className="seesaw-base" style={{ transformOrigin: "120px 128px" }}>
          <path d="M120 82 L102 128 L138 128 Z" stroke="var(--brand)" fill="none" />
          <circle cx="120" cy="82" r="4" fill="var(--brand)" stroke="none" />
        </g>

        {/* plank + riders pivot together around the fulcrum tip */}
        <g className="seesaw-plank" style={{ transformOrigin: "120px 82px" }}>
          {/* plank board, slightly curved ends */}
          <path d="M22 82 Q120 74 218 82" strokeWidth="5" />
          {/* handle grips */}
          <path d="M40 82 L40 70" strokeWidth="3" />
          <path d="M200 82 L200 70" strokeWidth="3" />

          {/* left rider: small figure holding the handle, legs up */}
          <g stroke="var(--brand-glow)">
            <circle cx="40" cy="55" r="8" />
            <path d="M40 63 L40 78" />
            <path d="M40 78 Q30 84 24 92" />
            <path d="M40 78 Q50 82 56 88" />
            <path d="M40 68 L40 70" />
          </g>

          {/* right rider */}
          <g stroke="var(--brand-glow)">
            <circle cx="200" cy="55" r="8" />
            <path d="M200 63 L200 78" />
            <path d="M200 78 Q190 88 186 96" />
            <path d="M200 78 Q210 84 216 90" />
          </g>
        </g>
      </svg>

      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
        balancing the idea
      </p>
    </div>
  );
}
