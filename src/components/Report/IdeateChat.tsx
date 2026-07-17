// src/components/Report/IdeateChat.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import type { MarketResearchReport } from "@/lib/types";
import type { IdeateMessage } from "@/app/api/ideate/route";

const STARTER_PROMPTS = [
  "What if we targeted enterprise instead?",
  "How could we de-risk the biggest weakness?",
  "What would it take to hit a green verdict?",
];

export function IdeateChat({
  report,
  sessionId,
}: {
  report: MarketResearchReport;
  sessionId: string | null;
}) {
  const [messages, setMessages] = useState<IdeateMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: IdeateMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ideate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report, messages: nextMessages, sessionId }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = (await res.json()) as { reply: string };
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "Something went wrong. Try again?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card rounded-3xl border border-border flex flex-col h-[32rem]">
      <div className="px-6 pt-6 pb-3 border-b border-border">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brand">
          💡 Ideate further
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Push on the report — propose a pivot, poke a weakness, ask "what if."
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col gap-2">
            {STARTER_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="text-left text-sm font-serif italic text-muted-foreground border border-border rounded-2xl px-4 py-2.5 hover:border-brand hover:text-foreground transition-colors"
              >
                {p} →
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-auto text-white"
                : "mr-auto bg-white/5 text-foreground/90 border border-border"
            }`}
            style={m.role === "user" ? { backgroundColor: "var(--brand)" } : undefined}
          >
            {m.content.split("\n").map((line, j) => (
              <p key={j} className={j > 0 ? "mt-1.5" : undefined}>
                {line}
              </p>
            ))}
          </div>
        ))}

        {loading && (
          <div className="mr-auto max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-white/5 border border-border text-muted-foreground italic">
            thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 p-4 border-t border-border"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a follow-up…"
          className="flex-1 bg-white/5 border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-full px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white disabled:opacity-40 transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: "var(--brand)" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
