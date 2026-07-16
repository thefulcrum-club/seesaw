// src/lib/gemini/pmfSignalAgent.test.ts
import { config } from "dotenv";
import { describe, it, expect } from "vitest";
import { runPmfSignalAgent } from "./pmfSignalAgent";
import type { ResearchState } from "../types";

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

describe.skipIf(!hasApiKey)("pmfSignalAgent (live API)", () => {
  it("returns a summary and an evidence array", async () => {
    const result = await runPmfSignalAgent(sampleState);
    expect(result.summary.length).toBeGreaterThan(0);
    expect(Array.isArray(result.evidence)).toBe(true);
  }, 60000);
});
