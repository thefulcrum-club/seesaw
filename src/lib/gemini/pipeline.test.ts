// src/lib/gemini/pipeline.test.ts
import { config } from "dotenv";
import { describe, it, expect } from "vitest";
import { runPipeline } from "./pipeline";
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
  voiceExchanges: [
    {
      question: "What made you want to build this?",
      answerTranscript:
        "Our own team kept forgetting to update standup notes and it was a mess syncing across tools.",
    },
  ],
};

describe.skipIf(!hasApiKey)("runPipeline (live API, end-to-end)", () => {
  it("returns a fully populated MarketResearchReport", async () => {
    const report = await runPipeline(sampleState);

    expect(report.executive_summary.length).toBeGreaterThan(0);
    expect(report.tam_sam_som.tam.length).toBeGreaterThan(0);
    expect(report.competitors.length).toBeGreaterThan(0);
    expect(["green", "amber", "red"]).toContain(report.verdict.rating);
    expect(report.pros.length).toBeGreaterThan(0);
    expect(report.cons.length).toBeGreaterThan(0);
    expect(Array.isArray(report.sources)).toBe(true);
  }, 180000);
});
