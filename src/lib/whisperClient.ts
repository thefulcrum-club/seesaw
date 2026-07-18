// src/lib/whisperClient.ts
import { backendUrl } from "./backend";

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "answer.webm");

  const response = await fetch(backendUrl("/transcribe"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Backend transcribe request failed: ${response.status}`);
  }

  const data = (await response.json()) as { text: string };
  return data.text;
}
