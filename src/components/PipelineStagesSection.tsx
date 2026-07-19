// src/components/PipelineStagesSection.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { PIPELINE_STAGES } from "@/lib/stages";

export function PipelineStagesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="mx-auto max-w-2xl px-6 py-28">
      <p className="text-center font-mono text-[11px] uppercase tracking-[0.32em] text-brand mb-4">
        the pipeline
      </p>
      <h2 className="font-serif italic text-3xl sm:text-4xl text-center mb-16 text-balance">
        Six agents, one straight answer.
      </h2>

      <ol className="relative">
        <div
          className="absolute left-[15px] top-2 bottom-2 w-px bg-border"
          aria-hidden
        />
        {PIPELINE_STAGES.map((stage, i) => (
          <li
            key={stage.label}
            className={`relative flex gap-6 pb-10 last:pb-0 ${visible ? "animate-rise-in" : "opacity-0"}`}
            style={visible ? { animationDelay: `${i * 0.12}s` } : undefined}
          >
            <span
              className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]"
              style={{ borderColor: "var(--brand)", color: "var(--brand-glow)", backgroundColor: "var(--card)" }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="pt-0.5">
              <p className="font-serif text-lg italic text-foreground">{stage.label}</p>
              <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{stage.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
