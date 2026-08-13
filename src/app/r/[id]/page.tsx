// src/app/r/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ReportView } from "@/components/Report/ReportView";
import { backendUrl } from "@/lib/backend";
import type { PublicReport } from "@/lib/types";

export default function PublicReportPage() {
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<PublicReport | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(backendUrl(`/reports/${params.id}/public`))
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: PublicReport) => setReport(data))
      .catch(() => setNotFound(true));
  }, [params.id]);

  if (notFound) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center space-y-4">
        <p className="font-serif italic text-xl text-muted-foreground">
          This report isn&apos;t available.
        </p>
        <Link
          href="/"
          className="inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-brand"
        >
          ← seesaw home
        </Link>
      </div>
    );
  }

  if (!report) {
    return (
      <p className="text-center py-24 font-serif italic text-muted-foreground">
        Loading…
      </p>
    );
  }

  return (
    <div className="pt-6">
      <div className="max-w-4xl mx-auto px-6 mb-2 flex items-center justify-between">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
        >
          seesaw<span className="text-brand">.</span>
        </Link>
        <p className="font-serif italic text-lg text-foreground">{report.ideaName}</p>
      </div>
      <ReportView report={report.report} sessionId={null} readOnly />
    </div>
  );
}
