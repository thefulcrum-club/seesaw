// src/app/sessions/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { backendUrl } from "@/lib/backend";
import { EmailGate } from "@/components/EmailGate";
import { getStoredEmail } from "@/lib/email";
import type { SessionSummary } from "@/lib/types";

const VERDICT_META: Record<
  string,
  { dot: string; label: string; text: string; ring: string }
> = {
  green: { dot: "#34d399", label: "Green", text: "#6ee7b7", ring: "#34d39955" },
  amber: { dot: "#fbbf24", label: "Amber", text: "#fde68a", ring: "#fbbf2455" },
  red: { dot: "#fb7185", label: "Red", text: "#fda4af", ring: "#fb718555" },
};

type VerdictFilter = "all" | "green" | "amber" | "red";

export default function SessionsPage() {
  const [email, setEmail] = useState<string | null>(() => getStoredEmail());
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");

  useEffect(() => {
    if (!email) return;
    fetch(backendUrl(`/sessions?email=${encodeURIComponent(email)}`))
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data: SessionSummary[]) => setSessions(data))
      .catch(() => setError(true));
  }, [email]);

  const filtered = useMemo(() => {
    if (!sessions) return null;
    const q = query.trim().toLowerCase();
    return sessions.filter((s) => {
      const matchesQuery =
        !q ||
        s.ideaName.toLowerCase().includes(q) ||
        s.industry.toLowerCase().includes(q) ||
        s.targetMarket.toLowerCase().includes(q);
      const matchesVerdict =
        verdictFilter === "all" || s.verdict === verdictFilter;
      return matchesQuery && matchesVerdict;
    });
  }, [sessions, query, verdictFilter]);

  const counts = useMemo(() => {
    const c = { green: 0, amber: 0, red: 0 };
    for (const s of sessions ?? []) {
      if (s.verdict) c[s.verdict] += 1;
    }
    return c;
  }, [sessions]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-3 animate-rise-in">
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

      {email === null && (
        <EmailGate
          onSubmit={(submitted) => setEmail(submitted)}
        />
      )}

      {email && sessions && sessions.length > 0 && (
        <p className="animate-rise-in delay-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-10">
          {sessions.length} idea{sessions.length === 1 ? "" : "s"} researched ·{" "}
          {counts.green} green · {counts.amber} amber · {counts.red} red
        </p>
      )}

      {email && error && (
        <p className="text-rose-400 font-serif text-center py-12">
          Couldn&apos;t load past sessions.
        </p>
      )}

      {email && !error && sessions === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border border-border bg-card h-40 animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      )}

      {sessions && sessions.length === 0 && (
        <div className="text-center py-16 border border-border rounded-3xl bg-card animate-rise-in delay-2">
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
        <>
          <div className="flex flex-wrap items-center gap-3 mb-8 animate-rise-in delay-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ideas, industry, market…"
              className="flex-1 min-w-[200px] rounded-full border border-border bg-card px-5 py-2.5 font-serif italic text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
            />
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
              {(["all", "green", "amber", "red"] as VerdictFilter[]).map(
                (v) => {
                  const active = verdictFilter === v;
                  const meta = v !== "all" ? VERDICT_META[v] : null;
                  return (
                    <button
                      key={v}
                      onClick={() => setVerdictFilter(v)}
                      className="rounded-full border px-3.5 py-2 transition-colors flex items-center gap-1.5"
                      style={{
                        borderColor: active
                          ? meta?.dot ?? "var(--brand)"
                          : "var(--border)",
                        color: active
                          ? meta?.text ?? "var(--foreground)"
                          : "var(--muted-foreground)",
                        backgroundColor: active
                          ? (meta?.ring ?? "#1612d322")
                          : "transparent",
                      }}
                    >
                      {meta && (
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: meta.dot }}
                        />
                      )}
                      {v === "all" ? "All" : meta!.label}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {filtered && filtered.length === 0 && (
            <p className="text-muted-foreground font-serif italic text-center py-16">
              No ideas match “{query}”.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered?.map((s, i) => (
              <SessionCard key={s.id} session={s} delayMs={i * 45} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SessionCard({
  session,
  delayMs,
}: {
  session: SessionSummary;
  delayMs: number;
}) {
  const meta = session.verdict ? VERDICT_META[session.verdict] : null;
  const restricted = !session.isPublic;

  const cardBody = (
    <>
      {meta && !restricted && (
        <div
          className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"
          style={{ backgroundColor: meta.dot }}
        />
      )}

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <p className="font-serif italic text-xl text-foreground leading-snug line-clamp-2">
            {session.ideaName}
          </p>
          {restricted ? (
            <span className="shrink-0 flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              🔒 Private
            </span>
          ) : meta ? (
            <span
              className="shrink-0 flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em]"
              style={{ borderColor: meta.ring, color: meta.text }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: meta.dot }}
              />
              {meta.label}
            </span>
          ) : (
            <span className="shrink-0 rounded-full border border-border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              —
            </span>
          )}
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed mt-2 line-clamp-2">
          {restricted ? "Details are private." : session.targetMarket}
        </p>
      </div>

      <div className="relative flex items-center justify-between mt-4 pt-3 border-t border-border">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground truncate">
          {session.industry}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground shrink-0 ml-2">
          {new Date(session.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
    </>
  );

  if (restricted) {
    return (
      <div
        className="group relative flex flex-col justify-between rounded-3xl border border-border bg-card p-5 min-h-[168px] overflow-hidden opacity-70 cursor-not-allowed animate-step-in"
        style={{ animationDelay: `${delayMs}ms` }}
        title="This research is private"
      >
        {cardBody}
      </div>
    );
  }

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="group relative flex flex-col justify-between rounded-3xl border border-border bg-card p-5 min-h-[168px] overflow-hidden hover:border-brand transition-colors animate-step-in"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {cardBody}
    </Link>
  );
}
