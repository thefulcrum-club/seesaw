// src/lib/gemini/feasibilityGeoAgent.ts
import { runGroundedResearch, runStructuring } from "./client";
import { classifyIsLocal } from "./localClassifier";
import { localeInstruction } from "./marketLocale";
import type { ResearchState, FeasibilitySection, MarketLocale } from "../types";

export async function runFeasibilityGeoAgent(
  state: ResearchState,
  locale: MarketLocale
): Promise<FeasibilitySection> {
  const localClassification = await classifyIsLocal(state);

  const geoInstruction = localClassification.isInherentlyLocal
    ? `This idea IS classified as inherently local (${localClassification.reasoning}). Research local market conditions relevant to it and include that analysis.`
    : `This idea is NOT classified as inherently local (${localClassification.reasoning}). Do not include geo/local market analysis.`;

  const research = await runGroundedResearch(`Search the web for technical, regulatory, and go-to-market barriers relevant to this startup idea.

Idea: ${state.form.ideaName}
Description: ${state.form.description}
Industry: ${state.form.industry}
Target market: ${state.form.targetMarket}

${geoInstruction}

${localeInstruction(locale)}

If you cannot find enough information to assess any of these barriers, say so explicitly.`);

  const structured = await runStructuring<{
    technical: string;
    regulatory: string;
    go_to_market: string;
  }>(
    `Structure the following feasibility research into technical, regulatory, and go_to_market fields.

Research:
${research.text}`,
    {
      type: "object",
      properties: {
        technical: { type: "string" },
        regulatory: { type: "string" },
        go_to_market: { type: "string" },
      },
      required: ["technical", "regulatory", "go_to_market"],
    }
  );

  let geoAnalysis: string | null = null;
  if (localClassification.isInherentlyLocal) {
    const geoStructured = await runStructuring<{ analysis: string }>(
      `Extract just the local/geo market analysis from the following research into a single "analysis" field.

Research:
${research.text}`,
      {
        type: "object",
        properties: { analysis: { type: "string" } },
        required: ["analysis"],
      }
    );
    geoAnalysis = geoStructured.analysis;
  }

  return {
    ...structured,
    geo: {
      applicable: localClassification.isInherentlyLocal,
      analysis: geoAnalysis,
    },
  };
}
