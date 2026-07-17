// src/lib/gemini/economicsAgent.ts
import { runGroundedResearch, runStructuring } from "./client";
import { economicsSchema } from "./schemas";
import { localeInstruction } from "./marketLocale";
import type {
  ResearchState,
  MarketSizeSection,
  EconomicsSection,
  MarketLocale,
} from "../types";

export async function runEconomicsAgent(
  state: ResearchState,
  marketSize: MarketSizeSection,
  locale: MarketLocale
): Promise<EconomicsSection> {
  const research = await runGroundedResearch(`Search the web for comparable pricing and cost benchmarks for this type of product, to determine a sensible pricing model and margin.

Idea: ${state.form.ideaName}
Description: ${state.form.description}
Industry: ${state.form.industry}

Serviceable Obtainable Market (SOM) estimate for capital planning: ${marketSize.som}

${localeInstruction(locale)}

Based on comparable pricing in this space, propose a pricing model and estimate the implied margin. Then estimate the capital required to reach the stated SOM (e.g. for customer acquisition, product build, team). If real benchmarks aren't available for any part of this, say so explicitly rather than inventing a number.`);

  return runStructuring<EconomicsSection>(
    `Structure the following economics research into pricing_model, implied_margin, and capital_target_to_som fields.

Research:
${research.text}`,
    economicsSchema
  );
}
