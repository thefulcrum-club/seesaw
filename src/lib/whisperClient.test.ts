// src/lib/whisperClient.test.ts
import { describe, it, expect } from "vitest";
import { transcribeAudio } from "./whisperClient";
import { readFileSync } from "fs";

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

describe("transcribeAudio (live seesaw-backend)", () => {
  it("transcribes a real audio file into non-empty text", async () => {
    const reachable = await backendReachable();
    if (!reachable) {
      console.warn("seesaw-backend not reachable at localhost:8000, skipping");
      return;
    }

    const audioPath = "/tmp/test.wav";
    const buffer = readFileSync(audioPath);
    const blob = new Blob([buffer], { type: "audio/wav" });

    const text = await transcribeAudio(blob);
    expect(text.length).toBeGreaterThan(0);
  }, 30000);
});
