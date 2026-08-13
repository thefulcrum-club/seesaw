// src/lib/sampleReport.ts

import type { MarketResearchReport } from "./types";

export const SAMPLE_IDEA_NAME = "Nimbus";

export const sampleReport: MarketResearchReport = {
  executive_summary: [
    "Nimbus automates weekly status reporting for distributed engineering teams by summarizing standup notes, PR activity, and ticket movement into a single async digest.",
    "Target buyers are engineering managers at 20–200 person remote-first companies who currently spend 2–4 hours a week compiling manual reports.",
    "Early signal is strongest in dev-tools-adjacent teams already using Slack and Linear, where integration friction is lowest.",
  ],
  tam_sam_som: {
    tam: "$4.2B",
    sam: "$610M",
    som: "$18M",
    methodology:
      "Top-down from global engineering-management tooling spend, narrowed to remote-first teams of 20-200 using Slack + a modern issue tracker.",
  },
  competitors: [
    {
      name: "Geekbot",
      description: "Slack-native async standup bot with scheduled check-ins.",
      pricing: "$2.50/user/month",
      positioning: "Standup-first, minimal reporting synthesis.",
    },
    {
      name: "Range",
      description: "Team check-ins and objectives tracking with a dashboard.",
      pricing: "$8/user/month",
      positioning: "Broader OKR + check-in suite, higher price point.",
    },
    {
      name: "Status Hero",
      description: "Aggregates check-ins from chat and dev tools into reports.",
      pricing: "$5/user/month",
      positioning: "Closest direct competitor; weaker AI summarization.",
    },
  ],
  swot: {
    strengths: [
      "Deep integration with existing dev workflow (PRs, tickets) rather than a new check-in ritual.",
      "AI summarization reduces manual synthesis time to near zero.",
    ],
    weaknesses: [
      "Depends on teams already using structured tools (Linear/Jira) — weaker fit for ad hoc teams.",
      "No existing brand recognition in a crowded async-standup category.",
    ],
    opportunities: [
      "Expand into automated sprint retros and velocity reporting as a second wedge.",
      "Partnerships with Linear/Jira app marketplaces for distribution.",
    ],
    threats: [
      "Incumbents (Range, Status Hero) could ship equivalent AI summarization quickly.",
      "Engineering managers may resist another tool without clear ROI proof in the first two weeks.",
    ],
  },
  pmf_signal: {
    summary:
      "Moderate early signal: several public complaints about manual status-report overhead in engineering-manager communities, but no direct evidence of willingness to pay yet.",
    evidence: [
      {
        claim: "Engineering managers on r/ExperiencedDevs frequently cite weekly status reports as their least favorite recurring task.",
        source_url: null,
      },
      {
        claim: "Status Hero and Range both report steady but not explosive growth, suggesting a real but modest-sized market.",
        source_url: null,
      },
    ],
  },
  economics: {
    pricing_model: ["Per-seat SaaS, $6-9/user/month", "Team-tier annual plans with volume discount"],
    implied_margin: ["~78% gross margin at scale (LLM inference is main variable cost)"],
    capital_target_to_som: ["$1.5-2M seed to reach $18M SOM over 3 years"],
  },
  feasibility: {
    technical: [
      "Core summarization pipeline is buildable with existing LLM APIs; main engineering effort is integration breadth (Slack, Linear, Jira, GitHub).",
    ],
    regulatory: ["Minimal — B2B SaaS handling internal team metadata, no PII/health/finance data."],
    go_to_market: [
      "Bottoms-up PLG via Slack/Linear app marketplaces, free tier capped at team size.",
      "Content marketing targeting engineering-manager pain points (status report fatigue).",
    ],
    geo: { applicable: false, analysis: null },
  },
  verdict: {
    rating: "amber",
    reasoning:
      "Real, validated pain point with several credible competitors already monetizing it — the category exists. But Nimbus has no clear differentiation beyond \"better AI summarization,\" which is a thin moat as incumbents can copy it quickly. Amber: worth a scoped pilot with 3-5 design partners before committing capital.",
  },
  pros: [
    "Clear, recurring pain point with existing willingness to pay in the category.",
    "Low regulatory complexity, fast technical path to an MVP.",
  ],
  cons: [
    "Differentiation from incumbents is currently thin.",
    "PMF evidence is inferred from adjacent products, not direct customer validation.",
  ],
  sources: [
    { title: "Geekbot pricing", url: "https://geekbot.com/pricing" },
    { title: "Range product overview", url: "https://range.co" },
    { title: "Status Hero features", url: "https://statushero.com" },
  ],
};
