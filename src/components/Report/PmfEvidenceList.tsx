// src/components/Report/PmfEvidenceList.tsx
"use client";

import { useState } from "react";
import type { MarketResearchReport } from "@/lib/types";

const COLLAPSED_COUNT = 3;

export function PmfEvidenceList({
  pmfSignal,
}: {
  pmfSignal: MarketResearchReport["pmf_signal"];
}) {
  const [expanded, setExpanded] = useState(false);
  const evidence = pmfSignal.evidence;
  const visible = expanded ? evidence : evidence.slice(0, COLLAPSED_COUNT);
  const remaining = evidence.length - COLLAPSED_COUNT;

  return (
    <div className="bg-card rounded-3xl border border-border p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brand mb-3">
        🔍 Product-market fit signal
      </p>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {pmfSignal.summary}
      </p>
      <ul className="space-y-2">
        {visible.map((e, i) => (
          <li
            key={i}
            className={`flex gap-2.5 text-sm leading-snug ${
              e.source_url ? "text-foreground/90" : "italic text-muted-foreground"
            }`}
          >
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            <span>
              {e.claim}
              {e.source_url && (
                <>
                  {" "}
                  (
                  <a
                    href={e.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline"
                  >
                    source
                  </a>
                  )
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <button
          onClick={() => setExpanded((x) => !x)}
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand mt-4"
        >
          {expanded ? "Show less" : `Show ${remaining} more`}
        </button>
      )}
    </div>
  );
}
