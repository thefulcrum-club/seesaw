// src/lib/gemini/schemas.ts

export const marketSizeSchema = {
  type: "object",
  properties: {
    tam: { type: "string" },
    sam: { type: "string" },
    som: { type: "string" },
    methodology: { type: "string" },
  },
  required: ["tam", "sam", "som", "methodology"],
};

export const competitorsSchema = {
  type: "object",
  properties: {
    competitors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          pricing: { type: "string" },
          positioning: { type: "string" },
        },
        required: ["name", "description", "pricing", "positioning"],
      },
    },
  },
  required: ["competitors"],
};

export const pmfSignalSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    evidence: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          source_url: { type: "string", nullable: true },
        },
        required: ["claim", "source_url"],
      },
    },
  },
  required: ["summary", "evidence"],
};

export const economicsSchema = {
  type: "object",
  properties: {
    pricing_model: { type: "array", items: { type: "string" } },
    implied_margin: { type: "array", items: { type: "string" } },
    capital_target_to_som: { type: "array", items: { type: "string" } },
  },
  required: ["pricing_model", "implied_margin", "capital_target_to_som"],
};

export const feasibilitySchema = {
  type: "object",
  properties: {
    technical: { type: "array", items: { type: "string" } },
    regulatory: { type: "array", items: { type: "string" } },
    go_to_market: { type: "array", items: { type: "string" } },
    geo: {
      type: "object",
      properties: {
        applicable: { type: "boolean" },
        analysis: {
          type: "array",
          items: { type: "string" },
          nullable: true,
        },
      },
      required: ["applicable", "analysis"],
    },
  },
  required: ["technical", "regulatory", "go_to_market", "geo"],
};

export const localClassifierSchema = {
  type: "object",
  properties: {
    isInherentlyLocal: { type: "boolean" },
    reasoning: { type: "string" },
  },
  required: ["isInherentlyLocal", "reasoning"],
};

export const marketLocaleSchema = {
  type: "object",
  properties: {
    market: { type: "string", enum: ["india", "us", "global"] },
    currency: { type: "string", enum: ["INR", "USD"] },
    reasoning: { type: "string" },
  },
  required: ["market", "currency", "reasoning"],
};

export const synthesisSchema = {
  type: "object",
  properties: {
    executive_summary: { type: "array", items: { type: "string" } },
    swot: {
      type: "object",
      properties: {
        strengths: { type: "array", items: { type: "string" } },
        weaknesses: { type: "array", items: { type: "string" } },
        opportunities: { type: "array", items: { type: "string" } },
        threats: { type: "array", items: { type: "string" } },
      },
      required: ["strengths", "weaknesses", "opportunities", "threats"],
    },
    verdict: {
      type: "object",
      properties: {
        rating: { type: "string", enum: ["green", "amber", "red"] },
        reasoning: { type: "string" },
      },
      required: ["rating", "reasoning"],
    },
    pros: { type: "array", items: { type: "string" } },
    cons: { type: "array", items: { type: "string" } },
  },
  required: ["executive_summary", "swot", "verdict", "pros", "cons"],
};
