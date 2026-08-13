// src/app/sessions/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ReportView } from "@/components/Report/ReportView";
import { backendUrl } from "@/lib/backend";
import { getStoredEmail } from "@/lib/email";
import type { SessionDetail } from "@/lib/types";

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "not-found" | "restricted">(
    "loading"
  );

  useEffect(() => {
    const email = getStoredEmail();
    if (!email) {
      router.replace("/sessions");
      return;
    }
    fetch(backendUrl(`/sessions/${params.id}?email=${encodeURIComponent(email)}`))
      .then((res) => {
        if (res.status === 403) {
          setStatus("restricted");
          return null;
        }
        if (!res.ok) {
          setStatus("not-found");
          return null;
        }
        return res.json();
      })
      .then((data: SessionDetail | null) => {
        if (data) {
          setSession(data);
          setStatus("ok");
        }
      })
      .catch(() => setStatus("not-found"));
  }, [params.id, router]);

  if (status === "restricted") {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center space-y-4">
        <p className="font-serif italic text-xl text-muted-foreground">
          🔒 This research is private.
        </p>
        <Link
          href="/sessions"
          className="inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-brand"
        >
          ← Back to past research
        </Link>
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center space-y-4">
        <p className="font-serif italic text-xl text-muted-foreground">
          Couldn&apos;t find that session.
        </p>
        <Link
          href="/sessions"
          className="inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-brand"
        >
          ← Back to past research
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <p className="text-center py-24 font-serif italic text-muted-foreground">
        Loading…
      </p>
    );
  }

  return (
    <div className="pt-6">
      <div className="max-w-4xl mx-auto px-6 mb-2">
        <Link
          href="/sessions"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to past research
        </Link>
      </div>
      <ReportView
        report={session.report}
        sessionId={session.id}
        initialIdeateMessages={session.ideateMessages}
        onNewResearch={() => router.push("/")}
      />
    </div>
  );
}
