// src/lib/gemini/marketSizeAgent.ts
import { runGroundedResearch, runStructuring } from "./client";
import { marketSizeSchema } from "./schemas";
import type { ResearchState, MarketSizeSection } from "../types";

function buildResearchPrompt(state: ResearchState): string {
  const transcript = state.voiceExchanges
    .map((e) => `Q: ${e.question}\nA: ${e.answerTranscript}`)
    .join("\n\n");

  return `You are researching the market size for this startup idea. Search the web for real, current data.

Idea: ${state.form.ideaName}
Description: ${state.form.description}
Industry: ${state.form.industry}
Target market: ${state.form.targetMarket}

Additional context from founder interview:
${transcript || "(none provided)"}

Research and estimate TAM (Total Addressable Market), SAM (Serviceable Addressable Market), and SOM (Serviceable Obtainable Market) for this idea, citing real sources with figures and dates where possible. Explain your methodology.

If you cannot find enough real data to support a confident estimate for any of TAM, SAM, or SOM, say so explicitly and explain what's missing rather than guessing a number.`;
}

function buildStructuringPrompt(researchText: string): string {
  return `Structure the following market research into the required JSON shape. For any of tam/sam/som where the research explicitly states insufficient data was available, set that field's value to "insufficient data: <reason from the research>" instead of a number.

Research:
${researchText}`;
}

export async function runMarketSizeAgent(
  state: ResearchState
): Promise<MarketSizeSection> {
  const research = await runGroundedResearch(buildResearchPrompt(state));
  const structured = await runStructuring<{
    tam: string;
    sam: string;
    som: string;
    methodology: string;
  }>(buildStructuringPrompt(research.text), marketSizeSchema);

  return { ...structured, sources: research.sources };
}
