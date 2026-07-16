// src/lib/gemini/competitorAgent.ts
import { runGroundedResearch, runStructuring } from "./client";
import { competitorsSchema } from "./schemas";
import type { ResearchState, CompetitorSection } from "../types";

export async function runCompetitorAgent(
  state: ResearchState
): Promise<CompetitorSection[]> {
  const research = await runGroundedResearch(`Search the web for direct and indirect competitors to this startup idea.

Idea: ${state.form.ideaName}
Description: ${state.form.description}
Industry: ${state.form.industry}
Target market: ${state.form.targetMarket}

For each competitor found, note their pricing and market positioning. If you cannot find real pricing information for a competitor, say "insufficient data: pricing not publicly available" for that competitor's pricing rather than guessing.`);

  const structured = await runStructuring<{
    competitors: CompetitorSection[];
  }>(
    `Structure the following competitor research into a list of competitors, each with name, description, pricing, and positioning.

Research:
${research.text}`,
    competitorsSchema
  );

  return structured.competitors;
}
