// src/lib/gemini/synthesisAgent.ts
import { runStructuring } from "./client";
import { synthesisSchema } from "./schemas";
import type {
  ResearchState,
  MarketSizeSection,
  CompetitorSection,
  PmfSignalSection,
  EconomicsSection,
  FeasibilitySection,
} from "../types";

export type SynthesisResult = {
  executive_summary: string[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  verdict: { rating: "green" | "amber" | "red"; reasoning: string };
  pros: string[];
  cons: string[];
};

export async function runSynthesisAgent(
  state: ResearchState,
  marketSize: MarketSizeSection,
  competitors: CompetitorSection[],
  pmfSignal: PmfSignalSection,
  economics: EconomicsSection,
  feasibility: FeasibilitySection
): Promise<SynthesisResult> {
  const prompt = `You are synthesizing a full market research report from the stages below into an executive summary, SWOT analysis, a color-coded viability verdict, and pros/cons. Be honest — if the evidence is weak, the verdict should be amber or red, not flattering. Cite specifics from the research below rather than generic startup advice.

Write everything as short, scannable bullet points, not paragraphs. executive_summary must be 3-5 bullets, each a single short sentence (max ~15 words) covering: what the idea is, the core opportunity, and the biggest risk. verdict.reasoning must be one short sentence (max ~20 words). pros and cons should already be short phrases — keep them that way.

Idea: ${state.form.ideaName}
Description: ${state.form.description}

Market size:
${JSON.stringify(marketSize, null, 2)}

Competitors:
${JSON.stringify(competitors, null, 2)}

PMF signal:
${JSON.stringify(pmfSignal, null, 2)}

Economics:
${JSON.stringify(economics, null, 2)}

Feasibility:
${JSON.stringify(feasibility, null, 2)}

Verdict rules: "green" means strong sourced evidence across market size, PMF signal, and feasibility. "amber" means mixed evidence or notable gaps. "red" means weak/contradicted evidence or a fundamental viability problem. Do not default to green.`;

  return runStructuring<SynthesisResult>(prompt, synthesisSchema);
}
