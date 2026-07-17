// src/lib/whisperClient.test.ts
import { describe, it, expect } from "vitest";
import { transcribeAudio } from "./whisperClient";
import { readFileSync } from "fs";

async function whisperServiceReachable(): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.WHISPER_SERVICE_URL ?? "http://localhost:8000"}/health`
    );
    return res.ok;
  } catch {
    return false;
  }
}

describe("transcribeAudio (live whisper-service)", () => {
  it("transcribes a real audio file into non-empty text", async () => {
    const reachable = await whisperServiceReachable();
    if (!reachable) {
      console.warn("whisper-service not reachable at localhost:8000, skipping");
      return;
    }

    const audioPath = "/tmp/test.wav";
    const buffer = readFileSync(audioPath);
    const blob = new Blob([buffer], { type: "audio/wav" });

    const text = await transcribeAudio(blob);
    expect(text.length).toBeGreaterThan(0);
  }, 30000);
});
