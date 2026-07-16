// src/lib/gemini/economicsAgent.test.ts
import { config } from "dotenv";
import { describe, it, expect } from "vitest";
import { runEconomicsAgent } from "./economicsAgent";
import type { ResearchState, MarketSizeSection } from "../types";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const hasApiKey = !!process.env.GEMINI_API_KEY;

const sampleState: ResearchState = {
  form: {
    ideaName: "DeskPilot",
    description:
      "A SaaS tool that auto-schedules recurring team standups and syncs notes to Slack and Notion.",
    industry: "Productivity SaaS",
    targetMarket: "Remote-first B2B teams, 10-200 employees",
  },
  voiceExchanges: [],
};

const sampleMarketSize: MarketSizeSection = {
  tam: "$10B",
  sam: "$1B",
  som: "$10M",
  methodology: "Based on comparable productivity SaaS TAM reports.",
  sources: [],
};

describe.skipIf(!hasApiKey)("economicsAgent (live API)", () => {
  it("returns pricing model, margin, and capital target", async () => {
    const result = await runEconomicsAgent(sampleState, sampleMarketSize);
    expect(result.pricing_model.length).toBeGreaterThan(0);
    expect(result.implied_margin.length).toBeGreaterThan(0);
    expect(result.capital_target_to_som.length).toBeGreaterThan(0);
  }, 60000);
});
