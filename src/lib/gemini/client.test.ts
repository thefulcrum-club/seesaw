// src/lib/gemini/client.test.ts
import { config } from "dotenv";
import { describe, it, expect } from "vitest";
import { runGroundedResearch, runStructuring } from "./client";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const hasApiKey = !!process.env.GEMINI_API_KEY;

describe.skipIf(!hasApiKey)("gemini client (live API)", () => {
  it("runGroundedResearch returns text and at least one source for a searchable query", async () => {
    const result = await runGroundedResearch(
      "What is the current approximate global market size for productivity SaaS tools? Cite your sources."
    );
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0]).toHaveProperty("url");
  }, 30000);

  it("runStructuring returns JSON matching the given schema", async () => {
    const schema = {
      type: "object",
      properties: {
        greeting: { type: "string" },
        count: { type: "number" },
      },
      required: ["greeting", "count"],
    };
    const result = await runStructuring<{ greeting: string; count: number }>(
      "Return a friendly greeting and the number 42.",
      schema
    );
    expect(typeof result.greeting).toBe("string");
    expect(result.count).toBe(42);
  });
});
