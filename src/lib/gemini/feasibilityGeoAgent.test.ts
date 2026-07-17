// src/lib/gemini/feasibilityGeoAgent.test.ts
import { config } from "dotenv";
import { describe, it, expect } from "vitest";
import { runFeasibilityGeoAgent } from "./feasibilityGeoAgent";
import type { ResearchState, MarketLocale } from "../types";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const hasApiKey = !!process.env.GEMINI_API_KEY;

const nonLocalState: ResearchState = {
  form: {
    ideaName: "DeskPilot",
    description:
      "A SaaS tool that auto-schedules recurring team standups and syncs notes to Slack and Notion.",
    industry: "Productivity SaaS",
    targetMarket: "Remote-first B2B teams, 10-200 employees",
  },
  voiceExchanges: [],
};

const localState: ResearchState = {
  form: {
    ideaName: "CornerCart",
    description:
      "A same-day grocery delivery service for a single neighborhood, using local runners on bikes.",
    industry: "Local delivery",
    targetMarket: "Residents within a 2-mile radius of downtown Austin, TX",
  },
  voiceExchanges: [],
};

const sampleLocale: MarketLocale = {
  market: "us",
  currency: "USD",
  reasoning: "test fixture",
};

describe.skipIf(!hasApiKey)("feasibilityGeoAgent (live API)", () => {
  it("does not populate geo analysis for a non-local idea", async () => {
    const result = await runFeasibilityGeoAgent(nonLocalState, sampleLocale);
    expect(result.geo.applicable).toBe(false);
    expect(result.geo.analysis).toBeNull();
  }, 60000);

  it("populates geo analysis for an inherently local idea", async () => {
    const result = await runFeasibilityGeoAgent(localState, sampleLocale);
    expect(result.geo.applicable).toBe(true);
    expect(result.geo.analysis).not.toBeNull();
  }, 60000);
});
