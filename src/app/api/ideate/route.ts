// src/app/api/ideate/route.ts
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/db";
import type { MarketResearchReport } from "@/lib/types";

const MODEL = "gemini-2.5-flash";

function getClient() {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";

  if (project) {
    return new GoogleGenAI({ vertexai: true, project, location });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set (and GOOGLE_CLOUD_PROJECT is not set for Vertex AI mode)");
  }
  return new GoogleGenAI({ apiKey });
}

export type IdeateMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const { report, messages, sessionId } = (await request.json()) as {
    report: MarketResearchReport;
    messages: IdeateMessage[];
    sessionId?: string | null;
  };

  const lastUserMessage = messages[messages.length - 1];

  const systemContext = `You are fulcrum., a sharp, honest startup strategy advisor helping a founder ideate further on their market research report below. Be direct and specific — reference numbers, competitors, and risks from the report rather than generic advice. Keep answers short: 3-6 bullet points max, each under ~20 words, unless the founder explicitly asks for detail. Never use markdown headers or bold formatting — plain bullet text only.

Report:
${JSON.stringify(report, null, 2)}`;

  const contents = [
    { role: "user" as const, parts: [{ text: systemContext }] },
    {
      role: "model" as const,
      parts: [{ text: "Understood. I've reviewed the report — ask me anything about pivots, risks, or next steps." }],
    },
    ...messages.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: m.content }],
    })),
  ];

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
    });
    const reply = response.text ?? "";

    if (sessionId && lastUserMessage) {
      persistTurn(sessionId, lastUserMessage.content, reply).catch((error) => {
        console.error("Failed to persist ideate turn:", error);
      });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Ideate request failed:", error);
    return NextResponse.json(
      { error: "Couldn't get a response. Please try again." },
      { status: 502 }
    );
  }
}

async function persistTurn(sessionId: string, userContent: string, reply: string) {
  await prisma.ideateMessage.createMany({
    data: [
      { sessionId, role: "user", content: userContent },
      { sessionId, role: "assistant", content: reply },
    ],
  });
}
