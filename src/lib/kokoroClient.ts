// src/lib/kokoroClient.ts

export async function synthesizeSpeech(text: string): Promise<Blob> {
  const url = process.env.NEXT_PUBLIC_KOKORO_SERVICE_URL ?? "http://localhost:8880";
  const response = await fetch(`${url}/v1/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "kokoro",
      input: text,
      voice: "af_heart",
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    throw new Error(`Kokoro service returned ${response.status}`);
  }

  return response.blob();
}
