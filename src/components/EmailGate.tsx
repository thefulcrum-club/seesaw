// src/components/EmailGate.tsx
"use client";

import { useState } from "react";
import { isValidEmail, setStoredEmail } from "@/lib/email";

export function EmailGate({ onSubmit }: { onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setStoredEmail(trimmed);
    onSubmit(trimmed);
  }

  return (
    <div className="max-w-md mx-auto text-center space-y-6 py-16">
      <p className="font-serif italic text-2xl">
        Before we simulate<span style={{ color: "var(--brand)" }}>.</span>
      </p>
      <p className="text-muted-foreground font-serif text-lg leading-relaxed">
        Leave your email so we can save your research and let you find it again.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          placeholder="you@company.com"
          autoFocus
          className="w-full rounded-full border border-border bg-card px-5 py-3 font-serif italic text-center text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand transition-colors"
        />
        {error && <p className="text-rose-400 font-mono text-[11px] uppercase tracking-[0.14em]">{error}</p>}
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full px-8 py-3 font-mono text-[12px] uppercase tracking-[0.22em] text-white transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: "var(--brand)", boxShadow: "0 20px 60px -15px var(--brand)" }}
        >
          Continue <span>→</span>
        </button>
      </form>
    </div>
  );
}
