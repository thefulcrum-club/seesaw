# Replace Web Speech TTS with Kokoro

## Problem

`VoiceIntake.tsx` reads interview questions aloud using the browser's native
`SpeechSynthesisUtterance` API. Voice quality is robotic and inconsistent
across browsers/OSes. Kokoro is an open-weight TTS model that produces
much more natural speech and can run locally, matching the project's
existing pattern of a self-hosted microservice for speech (the Whisper STT
service used for transcription).

## Approach

Run Kokoro via the `kokoro-fastapi` Docker image, which exposes an
OpenAI-compatible `/v1/audio/speech` endpoint. Add a `kokoroClient.ts`
module (mirroring `whisperClient.ts`) that posts question text to this
endpoint and returns an audio `Blob`. `VoiceIntake.tsx`'s `speak()` is
rewritten to play that blob via an `Audio` element, falling back to the
existing browser `speechSynthesis` call if the Kokoro request fails for
any reason (service down, network error, non-2xx response).

This was chosen over a hosted TTS API (extra latency/cost, external
dependency) and over streaming playback (added complexity not justified
for single-sentence interview questions).

## Components

### `src/lib/kokoroClient.ts` (new)

```ts
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
```

### `src/components/VoiceIntake.tsx`

- Rename the current `speak()` implementation to `speakWithBrowserTTS()`
  (unchanged body).
- New `speak(text: string): Promise<void>`:
  1. Try `synthesizeSpeech(text)` from `kokoroClient`.
  2. On success, play the returned blob via
     `new Audio(URL.createObjectURL(blob))`; resolve the promise on the
     audio element's `ended`/`error` events; revoke the object URL after
     playback.
  3. On any thrown error (fetch failure, non-2xx, playback error), log a
     console warning and fall back to `speakWithBrowserTTS(text)`.
- No other changes to component logic, phases, or UI.

### Environment

- New env var `NEXT_PUBLIC_KOKORO_SERVICE_URL`, default
  `http://localhost:8880`. Document next to the existing
  `NEXT_PUBLIC_WHISPER_SERVICE_URL` wherever that's documented (README /
  `.env.example`).
- Document running Kokoro locally via Docker, e.g.:
  `docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest`
  (or the GPU image if available), alongside however the Whisper service
  is documented to run.

## Error Handling

TTS is never allowed to block the interview flow. Any failure to reach or
use the Kokoro service falls back silently (aside from a console warning)
to browser `speechSynthesis`. If browser speech synthesis is also
unavailable, `speak()` resolves immediately (existing behavior).

## Testing

- Unit test `src/lib/kokoroClient.test.ts` mirroring
  `whisperClient.test.ts`: mock `fetch`, assert request URL/body shape,
  assert a `Blob` is returned, assert a thrown error on non-2xx.
- Manual verification: run the Kokoro Docker container locally, load the
  voice intake flow, confirm the new voice plays for each question; then
  stop the container and confirm the flow still works via browser TTS
  fallback (no crash, no stuck "Speaking..." state).

## Out of Scope

- Voice picker UI (voice is hardcoded to `af_heart` for now).
- Streaming audio playback.
- Hosted/cloud Kokoro API support.
