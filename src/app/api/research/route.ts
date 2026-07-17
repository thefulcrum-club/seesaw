// src/app/api/research/route.ts
import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/gemini/pipeline";
import { prisma } from "@/lib/db";
import type { ResearchState, MarketResearchReport } from "@/lib/types";

export async function POST(request: Request) {
  const { researchState } = (await request.json()) as {
    researchState: ResearchState;
  };

  try {
    const report = await runPipeline(researchState);
    const sessionId = await persistSession(researchState, report);
    return NextResponse.json({ ...report, sessionId });
  } catch (error) {
    console.error("Pipeline failed:", error);
    return NextResponse.json(
      { error: "Research pipeline failed. Please try again." },
      { status: 502 }
    );
  }
}

async function persistSession(
  state: ResearchState,
  report: MarketResearchReport
): Promise<string | null> {
  try {
    const session = await prisma.session.create({
      data: {
        ideaName: state.form.ideaName,
        description: state.form.description,
        industry: state.form.industry,
        targetMarket: state.form.targetMarket,
        voiceExchanges: {
          create: state.voiceExchanges.map((e) => ({
            question: e.question,
            answerTranscript: e.answerTranscript,
          })),
        },
        report: {
          create: { data: JSON.stringify(report) },
        },
      },
    });
    return session.id;
  } catch (error) {
    // Persistence is best-effort — don't fail the research request over it.
    console.error("Failed to persist research session:", error);
    return null;
  }
}
