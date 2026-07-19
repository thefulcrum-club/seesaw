// src/components/AboutSection.tsx
"use client";

export function AboutSection() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-28 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-brand mb-4">
        what seesaw does
      </p>
      <h2 className="font-serif italic text-3xl sm:text-4xl md:text-5xl leading-tight text-balance mb-8">
        Every idea feels obvious from the inside.
      </h2>
      <p className="font-serif text-lg md:text-xl leading-relaxed text-muted-foreground max-w-2xl mx-auto">
        Seesaw is the outside view. Tell it what you&apos;re building, answer a few
        follow-up questions by voice or text, and a set of research agents goes
        to work — sizing the market, scouting competitors, reading real sentiment,
        and modeling the economics — so you get a grounded verdict instead of a
        gut feeling.
      </p>
      <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            input
          </p>
          <p className="font-serif text-base text-foreground">
            A short form, plus a quick voice or text conversation.
          </p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            process
          </p>
          <p className="font-serif text-base text-foreground">
            Six research agents, run in parallel where it makes sense.
          </p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            output
          </p>
          <p className="font-serif text-base text-foreground">
            A red, amber, or green verdict — with the reasoning shown.
          </p>
        </div>
      </div>
    </section>
  );
}
