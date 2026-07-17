// src/lib/gemini/marketLocale.ts
import { runStructuring } from "./client";
import { marketLocaleSchema } from "./schemas";
import type { ResearchState, MarketLocale } from "../types";

export async function classifyMarketLocale(
  state: ResearchState
): Promise<MarketLocale> {
  const prompt = `Idea: ${state.form.ideaName}
Description: ${state.form.description}
Target market: ${state.form.targetMarket}

Based on the target market description, classify which market this startup idea should be researched and reported for:
- "india" — the target market is India or an Indian city/region, or otherwise clearly Indian (e.g. mentions Indian cities, "India", INR, Indian-specific terms).
- "us" — the target market is the United States or a US city/region, or otherwise clearly American (e.g. mentions US cities, "US"/"USA", USD, American-specific terms).
- "global" — the target market explicitly spans multiple countries/regions or is explicitly described as worldwide/international.

If the target market description does not clearly indicate a country or region, default to "india" since that's this product's primary user base.

Also return the currency figures should be reported in: "INR" for market "india", "USD" for market "us" or "global".`;

  return runStructuring(prompt, marketLocaleSchema);
}

export function localeInstruction(locale: MarketLocale): string {
  if (locale.market === "india") {
    return `Report all monetary figures in Indian Rupees (INR, ₹), using Indian numbering conventions (lakh = 100,000, crore = 10,000,000) alongside the raw figure where helpful (e.g. "₹5 crore (₹50,000,000)"). Prioritize Indian sources and India-specific market data in your search.`;
  }
  if (locale.market === "us") {
    return `Report all monetary figures in US Dollars (USD, $). Prioritize US sources and US-specific market data in your search.`;
  }
  return `Report all monetary figures in US Dollars (USD, $), noting explicitly if figures vary meaningfully by region. Search broadly across international sources rather than favoring any single country.`;
}
