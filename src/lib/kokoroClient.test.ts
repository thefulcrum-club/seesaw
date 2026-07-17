// src/lib/kokoroClient.test.ts
import { describe, it, expect } from "vitest";
import { synthesizeSpeech } from "./kokoroClient";

async function kokoroServiceReachable(): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.KOKORO_SERVICE_URL ?? "http://localhost:8880"}/health`
    );
    return res.ok;
  } catch {
    return false;
  }
}

describe("synthesizeSpeech (live kokoro-service)", () => {
  it("returns non-empty audio for given text", async () => {
    const reachable = await kokoroServiceReachable();
    if (!reachable) {
      console.warn("kokoro-service not reachable at localhost:8880, skipping");
      return;
    }

    const blob = await synthesizeSpeech("Hello, this is a test.");
    expect(blob.size).toBeGreaterThan(0);
  }, 30000);

  it("throws when the service responds with an error status", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => new Response(null, { status: 500 });
    try {
      await expect(synthesizeSpeech("test")).rejects.toThrow("Kokoro service returned 500");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
