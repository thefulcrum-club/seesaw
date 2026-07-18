// src/app/sessions/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { backendUrl } from "@/lib/backend";
import type { SessionSummary } from "@/lib/types";

const VERDICT_DOT: Record<string, string> = {
  green: "#34d399",
  amber: "#fbbf24",
  red: "#fb7185",
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(backendUrl("/sessions"))
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data: SessionSummary[]) => setSessions(data))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="flex items-baseline justify-between mb-10">
        <h1 className="font-serif italic text-4xl">
          Past research<span style={{ color: "var(--brand)" }}>.</span>
        </h1>
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
        >
          + New research
        </Link>
      </div>

      {error && (
        <p className="text-rose-400 font-serif text-center py-12">
          Couldn't load past sessions.
        </p>
      )}

      {!error && sessions === null && (
        <p className="text-muted-foreground font-serif italic text-center py-12">
          Loading…
        </p>
      )}

      {sessions && sessions.length === 0 && (
        <div className="text-center py-16 border border-border rounded-3xl bg-card">
          <p className="text-muted-foreground font-serif italic mb-4">
            No research yet.
          </p>
          <Link
            href="/"
            className="inline-block rounded-full px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white"
            style={{ backgroundColor: "var(--brand)" }}
          >
            Start your first research
          </Link>
        </div>
      )}

      {sessions && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 hover:border-brand transition-colors"
            >
              <div className="min-w-0">
                <p className="font-serif italic text-lg text-foreground truncate">
                  {s.ideaName}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mt-1">
                  {s.industry} · {new Date(s.createdAt).toLocaleDateString()}
                </p>
              </div>
              {s.verdict && (
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: VERDICT_DOT[s.verdict] }}
                  aria-label={`${s.verdict} verdict`}
                />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
