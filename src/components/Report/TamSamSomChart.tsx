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
  { key: "tam", label: "TAM", width: 100, color: "bg-blue-400" },
  { key: "sam", label: "SAM", width: 65, color: "bg-violet-400" },
  { key: "som", label: "SOM", width: 35, color: "bg-pink-400" },
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
    <div className="bg-white rounded-3xl border-2 border-blue-100 p-6 space-y-4">
      {BARS.map((bar) => {
        const value = tamSamSom[bar.key];
        const insufficient = isInsufficient(value);
        return (
          <div key={bar.key}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="font-bold text-sm">{bar.label}</span>
              {!insufficient && <span className="text-sm text-gray-600">{value}</span>}
            </div>
            <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  insufficient
                    ? "bg-[repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb_8px,#d1d5db_8px,#d1d5db_16px)]"
                    : bar.color
                }`}
                style={{
                  width: grown ? `${bar.width}%` : "0%",
                  transition: "width 1s ease-out",
                }}
              />
            </div>
            {insufficient && (
              <p className="text-xs text-gray-500 italic mt-1">{value}</p>
            )}
          </div>
        );
      })}
      <p className="text-sm text-gray-600 pt-2 border-t border-gray-100">
        {tamSamSom.methodology}
      </p>
    </div>
  );
}
