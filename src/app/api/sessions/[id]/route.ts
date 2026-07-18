// src/app/api/sessions/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { MarketResearchReport } from "@/lib/types";
import type { IdeateMessage } from "@/app/api/ideate/route";

export type SessionDetail = {
  id: string;
  ideaName: string;
  description: string;
  industry: string;
  targetMarket: string;
  createdAt: string;
  report: MarketResearchReport;
  ideateMessages: IdeateMessage[];
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      report: true,
      ideateMessages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session || !session.report) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const detail: SessionDetail = {
    id: session.id,
    ideaName: session.ideaName,
    description: session.description,
    industry: session.industry,
    targetMarket: session.targetMarket,
    createdAt: session.createdAt.toISOString(),
    report: JSON.parse(session.report.data) as MarketResearchReport,
    ideateMessages: session.ideateMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  };

  return NextResponse.json(detail);
}
