// src/components/ReferralCard.tsx
"use client";

import { useEffect, useState } from "react";
import { backendUrl } from "@/lib/backend";
import { referralLink } from "@/lib/referral";
import type { ReferralStats } from "@/lib/types";

export function ReferralCard({ email }: { email: string }) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(backendUrl(`/leads/${encodeURIComponent(email)}/referrals`))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ReferralStats | null) => setStats(data))
      .catch(() => setStats(null));
  }, [email]);

  if (!stats) return null;

  const link = referralLink(stats.referralCode);

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="animate-rise-in delay-1 mb-10 rounded-3xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
          Your referral link
        </p>
        <p className="font-serif italic text-sm text-foreground truncate max-w-xs">{link}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {stats.referralCount} joined
        </span>
        <button
          onClick={handleCopy}
          className="rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] border border-border text-muted-foreground hover:text-foreground hover:border-brand transition-colors"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
