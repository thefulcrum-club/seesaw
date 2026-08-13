// src/app/sample/page.tsx
"use client";

import Link from "next/link";
import { ReportView } from "@/components/Report/ReportView";
import { sampleReport, SAMPLE_IDEA_NAME } from "@/lib/sampleReport";

export default function SamplePage() {
  return (
    <div className="pt-6">
      <div className="max-w-4xl mx-auto px-6 mb-2 flex items-center justify-between">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
        >
          seesaw<span className="text-brand">.</span>
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Sample report — {SAMPLE_IDEA_NAME}
        </p>
      </div>
      <ReportView report={sampleReport} sessionId={null} readOnly />
    </div>
  );
}
