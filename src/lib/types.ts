// src/lib/types.ts

export type IdeaFormInput = {
  ideaName: string;
  description: string;
  industry: string;
  targetMarket: string;
};

export type VoiceExchange = {
  question: string;
  answerTranscript: string;
};

export type ResearchState = {
  form: IdeaFormInput;
  voiceExchanges: VoiceExchange[];
  marketSize?: MarketSizeSection;
  competitors?: CompetitorSection[];
  pmfSignal?: PmfSignalSection;
  economics?: EconomicsSection;
  feasibility?: FeasibilitySection;
};

export type MarketLocale = {
  market: "india" | "us" | "global";
  currency: "INR" | "USD";
  reasoning: string;
};

export type SourcedClaim = { claim: string; source_url: string | null };

export type MarketSizeSection = {
  tam: string;
  sam: string;
  som: string;
  methodology: string;
  sources: { title: string; url: string }[];
};

export type CompetitorSection = {
  name: string;
  description: string;
  pricing: string;
  positioning: string;
};

export type PmfSignalSection = {
  summary: string;
  evidence: SourcedClaim[];
};

export type EconomicsSection = {
  pricing_model: string[];
  implied_margin: string[];
  capital_target_to_som: string[];
};

export type FeasibilitySection = {
  technical: string[];
  regulatory: string[];
  go_to_market: string[];
  geo: { applicable: boolean; analysis: string[] | null };
};

export type MarketResearchReport = {
  executive_summary: string[];
  tam_sam_som: {
    tam: string;
    sam: string;
    som: string;
    methodology: string;
  };
  competitors: CompetitorSection[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  pmf_signal: PmfSignalSection;
  economics: EconomicsSection;
  feasibility: FeasibilitySection;
  verdict: {
    rating: "green" | "amber" | "red";
    reasoning: string;
  };
  pros: string[];
  cons: string[];
  sources: { title: string; url: string }[];
};

export type MarketResearchReportResponse = MarketResearchReport & {
  sessionId: string | null;
};

export type IdeateMessage = { role: "user" | "assistant"; content: string };

export type SessionSummary = {
  id: string;
  ideaName: string;
  industry: string;
  targetMarket: string;
  createdAt: string;
  verdict: MarketResearchReport["verdict"]["rating"] | null;
};

export type SessionDetail = {
  id: string;
  ideaName: string;
  description: string;
  industry: string;
  targetMarket: string;
  createdAt: string;
  report: MarketResearchReport;
  ideateMessages: IdeateMessage[];
};
