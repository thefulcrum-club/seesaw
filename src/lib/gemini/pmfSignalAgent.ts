// src/lib/gemini/pmfSignalAgent.ts
import { runGroundedResearch, runStructuring } from "./client";
import { pmfSignalSchema } from "./schemas";
import type { ResearchState, PmfSignalSection } from "../types";

export async function runPmfSignalAgent(
  state: ResearchState
): Promise<PmfSignalSection> {
  const research = await runGroundedResearch(`Search forums, review sites, and complaint threads for real evidence that the pain point behind this idea actually exists and bothers people enough to matter.

Idea: ${state.form.ideaName}
Description: ${state.form.description}
Target market: ${state.form.targetMarket}

Do not construct a plausible-sounding story — only report evidence you actually found, with sources. If you find little or no real evidence, say so explicitly rather than inferring that the pain point probably exists.`);

  const structured = await runStructuring<{
    summary: string;
    evidence: { claim: string; source_url: string | null }[];
  }>(
    `Structure the following pain-point research into a summary and a list of specific evidence claims. For each evidence claim, include the source URL if the research cited one, otherwise set source_url to null and make sure the claim text states why data was insufficient.

Research:
${research.text}`,
    pmfSignalSchema
  );

  return structured;
}
