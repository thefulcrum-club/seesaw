// src/lib/gemini/pipeline.ts
import { runMarketSizeAgent } from "./marketSizeAgent";
import { runCompetitorAgent } from "./competitorAgent";
import { runPmfSignalAgent } from "./pmfSignalAgent";
import { runEconomicsAgent } from "./economicsAgent";
import { runFeasibilityGeoAgent } from "./feasibilityGeoAgent";
import { runSynthesisAgent } from "./synthesisAgent";
import type { ResearchState, MarketResearchReport } from "../types";

export async function runPipeline(
  state: ResearchState
): Promise<MarketResearchReport> {
  const [marketSize, competitors, pmfSignal, feasibility] = await Promise.all([
    runMarketSizeAgent(state),
    runCompetitorAgent(state),
    runPmfSignalAgent(state),
    runFeasibilityGeoAgent(state),
  ]);

  const economics = await runEconomicsAgent(state, marketSize);

  const synthesis = await runSynthesisAgent(
    state,
    marketSize,
    competitors,
    pmfSignal,
    economics,
    feasibility
  );

  const allSources = [
    ...marketSize.sources,
    ...pmfSignal.evidence
      .filter((e) => e.source_url)
      .map((e) => ({ title: e.claim, url: e.source_url as string })),
  ];
  const dedupedSources = Array.from(
    new Map(allSources.map((s) => [s.url, s])).values()
  );

  return {
    executive_summary: synthesis.executive_summary,
    tam_sam_som: {
      tam: marketSize.tam,
      sam: marketSize.sam,
      som: marketSize.som,
      methodology: marketSize.methodology,
    },
    competitors,
    swot: synthesis.swot,
    pmf_signal: pmfSignal,
    economics,
    feasibility,
    verdict: synthesis.verdict,
    pros: synthesis.pros,
    cons: synthesis.cons,
    sources: dedupedSources,
  };
}
