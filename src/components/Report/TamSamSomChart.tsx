// src/components/Report/TamSamSomChart.tsx
"use client";

import { useEffect, useState } from "react";
import type { MarketResearchReport } from "@/lib/types";

const BARS: {
  key: "tam" | "sam" | "som";
  label: string;
  width: number;
  color: string;
}[] = [
  { key: "tam", label: "TAM", width: 100, color: "#6187ec" },
  { key: "sam", label: "SAM", width: 65, color: "#1612d3" },
  { key: "som", label: "SOM", width: 35, color: "#a855f7" },
];

function isInsufficient(value: string) {
  return value.toLowerCase().startsWith("insufficient data");
}

export function TamSamSomChart({
  tamSamSom,
}: {
  tamSamSom: MarketResearchReport["tam_sam_som"];
}) {
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setGrown(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-card rounded-3xl border border-border p-6 space-y-5">
      {BARS.map((bar) => {
        const value = tamSamSom[bar.key];
        const insufficient = isInsufficient(value);
        return (
          <div key={bar.key}>
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {bar.label}
              </span>
              {!insufficient && (
                <span className="text-sm font-serif italic text-foreground">{value}</span>
              )}
            </div>
            <div className="h-8 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: grown ? `${bar.width}%` : "0%",
                  transition: "width 1s ease-out",
                  background: insufficient
                    ? "repeating-linear-gradient(45deg, #ffffff14, #ffffff14 8px, #ffffff0a 8px, #ffffff0a 16px)"
                    : bar.color,
                }}
              />
            </div>
            {insufficient && (
              <p className="text-xs text-muted-foreground italic mt-1">{value}</p>
            )}
          </div>
        );
      })}
      <p className="text-sm text-muted-foreground pt-3 border-t border-border">
        {tamSamSom.methodology}
      </p>
    </div>
  );
}
