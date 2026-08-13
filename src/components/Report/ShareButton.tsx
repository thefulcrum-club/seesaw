// src/components/Report/ShareButton.tsx
"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { backendUrl } from "@/lib/backend";
import { getStoredEmail } from "@/lib/email";

export function ShareButton({
  sessionId,
  initialIsShared,
}: {
  sessionId: string;
  initialIsShared: boolean;
}) {
  const [isShared, setIsShared] = useState(initialIsShared);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/r/${sessionId}` : "";

  async function handleShare() {
    const email = getStoredEmail();
    if (!email) return;

    if (!isShared) {
      setLoading(true);
      try {
        const res = await fetch(
          backendUrl(`/sessions/${sessionId}/share?email=${encodeURIComponent(email)}`),
          { method: "POST" }
        );
        if (!res.ok) throw new Error("Share request failed");
        setIsShared(true);
        posthog.capture("report_shared", { session_id: sessionId });
      } catch {
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="rounded-full px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] border border-border text-muted-foreground hover:text-foreground hover:border-brand transition-colors disabled:opacity-50"
    >
      {loading ? "Sharing…" : copied ? "Link copied ✓" : isShared ? "Copy share link" : "Share"}
    </button>
  );
}
