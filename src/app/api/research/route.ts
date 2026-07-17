// src/app/api/research/route.ts
import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/gemini/pipeline";
import type { ResearchState } from "@/lib/types";

export async function POST(request: Request) {
  const { researchState } = (await request.json()) as {
    researchState: ResearchState;
  };

  try {
    const report = await runPipeline(researchState);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Pipeline failed:", error);
    return NextResponse.json(
      { error: "Research pipeline failed. Please try again." },
      { status: 502 }
    );
  }
}
