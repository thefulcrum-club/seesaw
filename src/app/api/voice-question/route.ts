// src/app/api/voice-question/route.ts
import { NextResponse } from "next/server";
import { runStructuring } from "@/lib/gemini/client";
import type { ResearchState } from "@/lib/types";

const MAX_EXCHANGES = 8;
const MIN_EXCHANGES = 5;

const nextQuestionSchema = {
  type: "object",
  properties: {
    done: { type: "boolean" },
    question: { type: "string", nullable: true },
  },
  required: ["done", "question"],
};

export async function POST(request: Request) {
  const { researchState } = (await request.json()) as {
    researchState: ResearchState;
  };

  const exchangeCount = researchState.voiceExchanges.length;

  if (exchangeCount >= MAX_EXCHANGES) {
    return NextResponse.json({ question: null, done: true });
  }

  const transcript = researchState.voiceExchanges
    .map((e) => `Q: ${e.question}\nA: ${e.answerTranscript}`)
    .join("\n\n");

  const prompt = `You are conducting a short adaptive founder interview (5-8 questions total, currently at question ${exchangeCount + 1}) to gather context before researching their startup idea.

Idea: ${researchState.form.ideaName}
Description: ${researchState.form.description}
Industry: ${researchState.form.industry}
Target market: ${researchState.form.targetMarket}

Conversation so far:
${transcript || "(none yet)"}

Ask ONE good follow-up question that would meaningfully help a market researcher (about the problem, target user, competitive awareness, pricing intuition, or goals) — skip anything already answered. If you have gathered enough (minimum ${MIN_EXCHANGES} exchanges reached and no more good questions to ask), set done to true and question to null. Otherwise set done to false and provide the question.`;

  const result = await runStructuring<{ done: boolean; question: string | null }>(
    prompt,
    nextQuestionSchema
  );

  if (exchangeCount < MIN_EXCHANGES) {
    return NextResponse.json({ ...result, done: false });
  }

  return NextResponse.json(result);
}
