// src/app/api/sessions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { MarketResearchReport } from "@/lib/types";

export type SessionSummary = {
  id: string;
  ideaName: string;
  industry: string;
  targetMarket: string;
  createdAt: string;
  verdict: MarketResearchReport["verdict"]["rating"] | null;
};

export async function GET() {
  const sessions = await prisma.session.findMany({
    where: { report: { isNot: null } },
    include: { report: true },
    orderBy: { createdAt: "desc" },
  });

  const summaries: SessionSummary[] = sessions.map((s) => {
    let verdict: SessionSummary["verdict"] = null;
    if (s.report) {
      try {
        const report = JSON.parse(s.report.data) as MarketResearchReport;
        verdict = report.verdict.rating;
      } catch {
        verdict = null;
      }
    }
    return {
      id: s.id,
      ideaName: s.ideaName,
      industry: s.industry,
      targetMarket: s.targetMarket,
      createdAt: s.createdAt.toISOString(),
      verdict,
    };
  });

  return NextResponse.json(summaries);
}
