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
    <div className="bg-white rounded-3xl border-2 border-yellow-100 p-6">
      <p className="font-bold mb-2">🔍 Product-market fit signal</p>
      <p className="text-sm text-gray-700 mb-3">{pmfSignal.summary}</p>
      <ul className="text-sm space-y-2">
        {visible.map((e, i) => (
          <li
            key={i}
            className={e.source_url ? "" : "italic text-gray-500"}
          >
            {e.claim}
            {e.source_url && (
              <>
                {" "}
                (
                <a
                  href={e.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  source
                </a>
                )
              </>
            )}
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <button
          onClick={() => setExpanded((x) => !x)}
          className="text-sm text-violet-600 font-medium mt-3"
        >
          {expanded ? "Show less" : `Show ${remaining} more`}
        </button>
      )}
    </div>
  );
}
