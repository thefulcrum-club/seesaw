// src/lib/gemini/marketSizeAgent.test.ts
import { config } from "dotenv";
import { describe, it, expect } from "vitest";
import { runMarketSizeAgent } from "./marketSizeAgent";
import { classifyIsLocal } from "./localClassifier";
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

describe.skipIf(!hasApiKey)("marketSizeAgent (live API)", () => {
  it("returns a market size section with methodology and sources", async () => {
    const result = await runMarketSizeAgent(sampleState, sampleLocale);
    expect(result.tam.length).toBeGreaterThan(0);
    expect(result.sam.length).toBeGreaterThan(0);
    expect(result.som.length).toBeGreaterThan(0);
    expect(result.methodology.length).toBeGreaterThan(0);
    expect(Array.isArray(result.sources)).toBe(true);
  }, 60000);

  it("classifies a non-local SaaS idea as not inherently local", async () => {
    const result = await classifyIsLocal(sampleState);
    expect(result.isInherentlyLocal).toBe(false);
  }, 30000);
});
