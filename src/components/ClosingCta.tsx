// src/components/ClosingCta.tsx
"use client";

export function ClosingCta({ onStart }: { onStart: () => void }) {
  return (
    <section className="mx-auto max-w-2xl px-6 py-28 text-center">
      <h2 className="font-serif italic text-3xl sm:text-4xl md:text-5xl leading-tight text-balance mb-8">
        Find out before you build it.
      </h2>
      <p className="font-serif text-lg text-muted-foreground max-w-xl mx-auto mb-10">
        Three minutes of your time, a straight verdict on the other end.
      </p>
      <button
        onClick={onStart}
        className="inline-flex items-center gap-2 rounded-full px-8 py-4 font-mono text-[12px] uppercase tracking-[0.22em] text-white transition-transform hover:-translate-y-0.5"
        style={{ backgroundColor: "var(--brand)", boxShadow: "0 20px 60px -15px var(--brand)" }}
      >
        Simulate your idea <span>→</span>
      </button>
    </section>
  );
}
