// src/lib/gemini/competitorAgent.test.ts
import { config } from "dotenv";
import { describe, it, expect } from "vitest";
import { runCompetitorAgent } from "./competitorAgent";
import type { ResearchState, MarketLocale } from "../types";

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

const sampleLocale: MarketLocale = {
  market: "us",
  currency: "USD",
  reasoning: "test fixture",
};

describe.skipIf(!hasApiKey)("competitorAgent (live API)", () => {
  it("returns at least one competitor with required fields", async () => {
    const result = await runCompetitorAgent(sampleState, sampleLocale);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("pricing");
    expect(result[0]).toHaveProperty("positioning");
  }, 60000);
});
