// src/lib/whisperClient.ts

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const url = process.env.NEXT_PUBLIC_WHISPER_SERVICE_URL ?? "http://localhost:8000";
  const formData = new FormData();
  formData.append("audio", audioBlob, "answer.webm");

  const response = await fetch(`${url}/transcribe`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Whisper service returned ${response.status}`);
  }

  const data = (await response.json()) as { text: string };
  return data.text;
}
