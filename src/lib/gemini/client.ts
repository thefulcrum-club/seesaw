// src/lib/gemini/client.ts
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash";

function getClient() {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";

  if (project) {
    // Vertex AI mode: uses Application Default Credentials (gcloud auth
    // application-default login) and the GCP project's own billing/quota,
    // bypassing the Gemini API free-tier per-key daily cap.
    return new GoogleGenAI({ vertexai: true, project, location });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set (and GOOGLE_CLOUD_PROJECT is not set for Vertex AI mode)");
  }
  return new GoogleGenAI({ apiKey });
}

export type GroundedResult = {
  text: string;
  sources: { title: string; url: string }[];
};

export async function runGroundedResearch(prompt: string): Promise<GroundedResult> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text ?? "";
  const groundingChunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  const sources = groundingChunks
    .map((chunk) => chunk.web)
    .filter((web): web is { uri: string; title?: string } => !!web?.uri)
    .map((web) => ({ title: web.title ?? web.uri, url: web.uri }));

  return { text, sources };
}

export async function runStructuring<T>(
  prompt: string,
  responseSchema: object
): Promise<T> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const text = response.text ?? "";
  return JSON.parse(text) as T;
}
