// src/components/IdeaForm.tsx
"use client";

import { useState } from "react";
import type { IdeaFormInput } from "@/lib/types";

const INDUSTRIES = [
  "Productivity SaaS",
  "Fintech",
  "Healthtech",
  "E-commerce",
  "Consumer social",
  "Developer tools",
  "Local services",
  "Other",
];

type FieldKey = keyof IdeaFormInput;

const STEPS: {
  key: FieldKey;
  label: string;
  prompt: string;
  placeholder?: string;
}[] = [
  {
    key: "ideaName",
    label: "Idea name",
    prompt: "What's your idea called?",
    placeholder: "e.g. Nimbus",
  },
  {
    key: "description",
    label: "Description",
    prompt: "In a sentence or two, what does it do?",
    placeholder: "e.g. A tool that helps small teams automate their weekly reporting…",
  },
  {
    key: "industry",
    label: "Industry",
    prompt: "Which industry is this closest to?",
  },
  {
    key: "targetMarket",
    label: "Target market",
    prompt: "Who is it for?",
    placeholder: "e.g. Solo founders and small agency owners in the US",
  },
];

export function IdeaForm({
  onSubmit,
}: {
  onSubmit: (input: IdeaFormInput) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [values, setValues] = useState<IdeaFormInput>({
    ideaName: "",
    description: "",
    industry: INDUSTRIES[0],
    targetMarket: "",
  });
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const value = values[step.key];

  function updateValue(next: string) {
    setValues((v) => ({ ...v, [step.key]: next }));
  }

  function goNext() {
    if (!value.trim()) {
      setError("This one's required.");
      return;
    }
    setError(null);
    if (isLastStep) {
      onSubmit(values);
      return;
    }
    setDirection("forward");
    setStepIndex((i) => i + 1);
  }

  function goBack() {
    if (stepIndex === 0) return;
    setError(null);
    setDirection("back");
    setStepIndex((i) => i - 1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      goNext();
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-12">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className="h-1.5 rounded-full transition-all duration-500 ease-out"
            style={{
              width: i === stepIndex ? "2rem" : "0.5rem",
              backgroundColor: i <= stepIndex ? "var(--brand)" : "var(--border)",
            }}
          />
        ))}
      </div>

      <div key={step.key} className="animate-step-in">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brand text-center mb-4">
          {String(stepIndex + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
        </p>

        <h2 className="font-serif italic text-3xl sm:text-4xl md:text-5xl text-center leading-tight mb-10 text-balance">
          {step.prompt}
        </h2>

        {step.key === "industry" ? (
          <div className="flex flex-wrap justify-center gap-3">
            {INDUSTRIES.map((industry) => (
              <button
                key={industry}
                type="button"
                onClick={() => updateValue(industry)}
                className={`rounded-full px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-all duration-200 ${
                  value === industry
                    ? "text-white scale-105"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-brand"
                }`}
                style={
                  value === industry
                    ? {
                        backgroundColor: "var(--brand)",
                        boxShadow: "0 10px 30px -10px var(--brand)",
                      }
                    : undefined
                }
              >
                {industry}
              </button>
            ))}
          </div>
        ) : step.key === "description" ? (
          <textarea
            autoFocus
            rows={3}
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={step.placeholder}
            className="w-full bg-transparent border-b-2 border-border focus:border-brand outline-none text-center font-serif text-xl sm:text-2xl leading-relaxed py-3 resize-none placeholder:text-muted-foreground/50 transition-colors"
          />
        ) : (
          <input
            autoFocus
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={step.placeholder}
            className="w-full bg-transparent border-b-2 border-border focus:border-brand outline-none text-center font-serif text-2xl sm:text-3xl py-3 placeholder:text-muted-foreground/50 transition-colors"
          />
        )}

        {error && (
          <p className="text-rose-400 text-sm text-center mt-4 font-mono uppercase tracking-wider">
            {error}
          </p>
        )}

        <div className="flex items-center justify-center gap-4 mt-10">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="rounded-full px-6 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground border border-border hover:text-foreground hover:border-brand transition-colors"
            >
              ← Back
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            className="rounded-full px-8 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white transition-transform hover:-translate-y-0.5"
            style={{
              backgroundColor: "var(--brand)",
              boxShadow: "0 10px 30px -10px var(--brand)",
            }}
          >
            {isLastStep ? "Continue to voice intake" : "Next"} →
          </button>
        </div>
      </div>
    </div>
  );
}
