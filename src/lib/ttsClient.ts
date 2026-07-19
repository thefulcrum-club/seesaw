// src/lib/kokoroClient.ts
import { backendUrl } from "./backend";

export async function synthesizeSpeech(text: string): Promise<Blob> {
  const response = await fetch(backendUrl("/tts"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Backend TTS request failed: ${response.status}`);
  }

  return response.blob();
}
