// src/lib/gemini/client.ts
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3-flash-preview";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
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
