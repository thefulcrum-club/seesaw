// src/lib/ttsClient.test.ts
import { describe, it, expect } from "vitest";
import { synthesizeSpeech } from "./ttsClient";

async function backendReachable(): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/health`
    );
    return res.ok;
  } catch {
    return false;
  }
}

describe("synthesizeSpeech (live seesaw-backend TTS)", () => {
  it("returns non-empty audio for given text", async () => {
    const reachable = await backendReachable();
    if (!reachable) {
      console.warn("seesaw-backend not reachable at localhost:8000, skipping");
      return;
    }

    const blob = await synthesizeSpeech("Hello, this is a test.");
    expect(blob.size).toBeGreaterThan(0);
  }, 30000);

  it("throws when the service responds with an error status", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => new Response(null, { status: 500 });
    try {
      await expect(synthesizeSpeech("test")).rejects.toThrow("Backend TTS request failed: 500");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
