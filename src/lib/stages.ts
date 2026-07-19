// src/lib/stages.ts

export const PIPELINE_STAGES = [
  {
    label: "Sizing the market",
    detail: "TAM, SAM, and SOM pulled from real market data, not a guess.",
  },
  {
    label: "Scouting competitors",
    detail: "Who else is already fighting for this customer, and how well.",
  },
  {
    label: "Reading the room",
    detail: "PMF signal from forums, reviews, and public sentiment.",
  },
  {
    label: "Checking feasibility",
    detail: "What it actually takes to build and ship this.",
  },
  {
    label: "Modeling the economics",
    detail: "Unit economics and a rough path to a business that works.",
  },
  {
    label: "Writing the verdict",
    detail: "A straight red, amber, or green call — with the reasoning shown.",
  },
] as const;

export const STAGES = PIPELINE_STAGES.map((s) => s.label);
