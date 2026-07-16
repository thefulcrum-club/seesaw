// src/lib/gemini/localClassifier.ts
import { runStructuring } from "./client";
import { localClassifierSchema } from "./schemas";
import type { ResearchState } from "../types";

export async function classifyIsLocal(
  state: ResearchState
): Promise<{ isInherentlyLocal: boolean; reasoning: string }> {
  const prompt = `Idea: ${state.form.ideaName}
Description: ${state.form.description}
Target market: ${state.form.targetMarket}

Is this idea INHERENTLY local — meaning its core value proposition only works within a specific city/region (e.g. a local delivery service, a neighborhood marketplace) — as opposed to an idea that could operate nationally or globally regardless of where it starts (e.g. most SaaS, most e-commerce)?

Answer strictly based on whether the business model itself requires geographic locality, not whether the founder happens to be starting local.`;

  return runStructuring(prompt, localClassifierSchema);
}
