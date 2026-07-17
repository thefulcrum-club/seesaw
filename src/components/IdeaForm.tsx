// src/components/IdeaForm.tsx
"use client";

import { useState } from "react";
import type { IdeaFormInput } from "@/lib/types";

const INDUSTRIES = [
  "Productivity SaaS",
  "Fintech",
  "Healthtech",
  "E-commerce",
  "Consumer social",
  "Developer tools",
  "Local services",
  "Other",
];

export function IdeaForm({
  onSubmit,
}: {
  onSubmit: (input: IdeaFormInput) => void;
}) {
  const [ideaName, setIdeaName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [targetMarket, setTargetMarket] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ideaName.trim() || !description.trim() || !targetMarket.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    onSubmit({ ideaName, description, industry, targetMarket });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Idea name</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={ideaName}
          onChange={(e) => setIdeaName(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          className="w-full border rounded px-3 py-2"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Industry</label>
        <select
          className="w-full border rounded px-3 py-2"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        >
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Target market</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={targetMarket}
          onChange={(e) => setTargetMarket(e.target.value)}
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        className="bg-black text-white rounded px-4 py-2 font-medium"
      >
        Continue to voice intake
      </button>
    </form>
  );
}
