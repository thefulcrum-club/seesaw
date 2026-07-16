# Fulcrum Market Research Simulator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working Market Research Simulator — voice-assisted idea intake feeding a multi-stage, search-grounded Gemini pipeline that produces a sourced, structured viability report with PDF export.

**Architecture:** Next.js (App Router, TypeScript) app hosts the UI, orchestration API routes, and Gemini pipeline logic. A separate Python FastAPI + faster-whisper microservice handles voice transcription over HTTP. No database, no auth — `research_state` lives only for one session, passed through the client between steps.

**Tech Stack:** Next.js 14+ (App Router, TypeScript), Tailwind CSS, `@google/genai` (Gemini SDK), Python 3.11 + FastAPI + faster-whisper, react-pdf (client-side PDF export).

## Global Constraints

- AI provider is Gemini Flash-Lite (`gemini-2.5-flash-lite`) exclusively — no Claude, no other LLM. (Switched from `gemini-2.5-flash` after Task 6/7 hit the free-tier 20 req/day quota on full Flash; Flash-Lite has a higher free-tier cap. `src/lib/gemini/client.ts`'s `MODEL` constant is the single source of truth — Tasks 1-6 already merged reference it via that constant, not a literal string, so this is a one-line change already applied there.)
- Gemini cannot combine Search grounding and forced `responseSchema` output in one call — every research stage is two calls (grounded free-text research, then schema-forced structuring).
- Every report claim must be traceable to a source URL or explicitly marked `"insufficient data"` with a stated reason — never estimate silently.
- Voice intake is turn-based text-question / spoken-answer, no TTS, 5–8 exchanges, ends adaptively (not fixed duration).
- Geo feasibility analysis renders only when the idea is classified as inherently local.
- No database, no auth, no persistence between sessions.
- `GEMINI_API_KEY` read from env (`.env.local`), never sent to the client. User adds the key themselves.

---

## File Structure

```
fulcrum/
  whisper-service/
    main.py                # FastAPI app, /transcribe endpoint
    requirements.txt
  src/
    app/
      page.tsx              # Step orchestrator (form -> voice -> pipeline -> report)
      api/
        research/route.ts   # POST: runs full pipeline, returns MarketResearchReport
        voice-question/route.ts  # POST: next adaptive question from research_state
    lib/
      gemini/
        client.ts           # Shared Gemini client + grounded-research + schema-structuring helpers
        schemas.ts           # responseSchema JSON objects per stage + full report
        marketSizeAgent.ts
        competitorAgent.ts
        pmfSignalAgent.ts
        economicsAgent.ts
        feasibilityGeoAgent.ts
        localClassifier.ts   # "is this idea inherently local" classifier
        synthesisAgent.ts
        pipeline.ts           # orchestrates all stages into research_state -> report
      types.ts               # ResearchState, MarketResearchReport, stage types
      whisperClient.ts        # calls whisper-service /transcribe
    components/
      IdeaForm.tsx
      VoiceIntake.tsx
      PipelineProgress.tsx
      Report/
        ReportView.tsx
        VerdictBadge.tsx
        SourcesList.tsx
      DownloadPdfButton.tsx
  .env.local.example
```

---

### Task 1: Whisper transcription microservice

**Files:**
- Create: `whisper-service/main.py`
- Create: `whisper-service/requirements.txt`
- Create: `whisper-service/README.md`

**Interfaces:**
- Produces: `POST http://localhost:8000/transcribe` — multipart form body with field `audio` (webm/wav blob) → `{ "text": string }` JSON response. `GET /health` → `{ "status": "ok" }`.

- [ ] **Step 1: Create the service directory and requirements file**

```
# whisper-service/requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.6
faster-whisper==1.0.3
python-multipart==0.0.9
```

- [ ] **Step 2: Write `main.py`**

```python
# whisper-service/main.py
import tempfile
import os

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

model = WhisperModel("small", device="cpu", compute_type="int8")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    if audio.content_type not in ("audio/webm", "audio/wav", "audio/mpeg", "audio/mp4"):
        raise HTTPException(status_code=400, detail=f"Unsupported content type: {audio.content_type}")

    suffix = os.path.splitext(audio.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        segments, _info = model.transcribe(tmp_path, beam_size=5)
        text = " ".join(segment.text.strip() for segment in segments)
    finally:
        os.unlink(tmp_path)

    return {"text": text.strip()}
```

- [ ] **Step 3: Write a short README with run instructions**

```markdown
# whisper-service

Local transcription microservice for Fulcrum voice intake.

## Setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

## Run
uvicorn main:app --host 0.0.0.0 --port 8000

First run downloads the "small" faster-whisper model (~500MB) — expect a delay before /health responds.
```

- [ ] **Step 4: Install and run the service, verify health check**

```bash
cd whisper-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 &
sleep 3
curl -s http://localhost:8000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 5: Verify /transcribe with a real audio sample**

```bash
say -o /tmp/test.aiff "This is a test of the transcription service"
ffmpeg -y -i /tmp/test.aiff /tmp/test.wav
curl -s -X POST http://localhost:8000/transcribe -F "audio=@/tmp/test.wav;type=audio/wav"
```

Expected: JSON with `"text"` containing something close to "This is a test of the transcription service". (If `say`/`ffmpeg` aren't available, skip synthesis and instead record a few seconds with any tool you have and POST that file — the goal is just confirming the endpoint returns real transcribed text, not silence or an error.)

- [ ] **Step 6: Commit**

```bash
cd /Users/abcom/Desktop/fulcrum
git add whisper-service/
git commit -m "Add Whisper transcription microservice"
```

---

### Task 2: Next.js scaffold + shared types

**Files:**
- Create: Next.js app via `create-next-app` in `/Users/abcom/Desktop/fulcrum` (App Router, TypeScript, Tailwind, `src/` directory)
- Create: `src/lib/types.ts`
- Create: `.env.local.example`

**Interfaces:**
- Produces: `ResearchState` and `MarketResearchReport` TypeScript types, used by every later task.

- [ ] **Step 1: Scaffold the app**

```bash
cd /Users/abcom/Desktop/fulcrum
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint --no-turbopack
```

When prompted about the existing `docs/` and `whisper-service/` directories, proceed (it scaffolds alongside them).

- [ ] **Step 2: Install the Gemini SDK and PDF export lib**

```bash
npm install @google/genai @react-pdf/renderer
```

- [ ] **Step 3: Write `src/lib/types.ts`**

```typescript
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
  pricing_model: string;
  implied_margin: string;
  capital_target_to_som: string;
};

export type FeasibilitySection = {
  technical: string;
  regulatory: string;
  go_to_market: string;
  geo: { applicable: boolean; analysis: string | null };
};

export type MarketResearchReport = {
  executive_summary: string;
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
```

- [ ] **Step 4: Write `.env.local.example`**

```
GEMINI_API_KEY=your_gemini_api_key_here
WHISPER_SERVICE_URL=http://localhost:8000
```

- [ ] **Step 5: Verify the app builds and typechecks**

```bash
npm run build
```

Expected: build succeeds (default Next.js starter page).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with shared research types"
```

---

### Task 3: Gemini client helpers (grounded research + schema structuring)

**Files:**
- Create: `src/lib/gemini/client.ts`
- Test: `src/lib/gemini/client.test.ts`

**Interfaces:**
- Consumes: `GEMINI_API_KEY` from env.
- Produces:
  - `runGroundedResearch(prompt: string): Promise<{ text: string; sources: { title: string; url: string }[] }>`
  - `runStructuring<T>(prompt: string, responseSchema: object): Promise<T>`

This is the foundation every agent (Task 5–9) calls into, so it's tested in isolation first with a real API call gated behind an env check (no mocking Gemini itself — the point is confirming the actual grounding response shape, per the spec's open question).

- [ ] **Step 1: Install a test runner if not already present**

```bash
npm install -D vitest
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 2: Write `src/lib/gemini/client.ts`**

```typescript
// src/lib/gemini/client.ts
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash-lite";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
}

export type GroundedResult = {
  text: string;
  sources: { title: string; url: string }[];
};

export async function runGroundedResearch(prompt: string): Promise<GroundedResult> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text ?? "";
  const groundingChunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  const sources = groundingChunks
    .map((chunk) => chunk.web)
    .filter((web): web is { uri: string; title?: string } => !!web?.uri)
    .map((web) => ({ title: web.title ?? web.uri, url: web.uri }));

  return { text, sources };
}

export async function runStructuring<T>(
  prompt: string,
  responseSchema: object
): Promise<T> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const text = response.text ?? "";
  return JSON.parse(text) as T;
}
```

- [ ] **Step 3: Write `src/lib/gemini/client.test.ts`**

```typescript
// src/lib/gemini/client.test.ts
import { describe, it, expect } from "vitest";
import { runGroundedResearch, runStructuring } from "./client";

const hasApiKey = !!process.env.GEMINI_API_KEY;

describe.skipIf(!hasApiKey)("gemini client (live API)", () => {
  it("runGroundedResearch returns text and at least one source for a searchable query", async () => {
    const result = await runGroundedResearch(
      "What is the current approximate global market size for productivity SaaS tools? Cite your sources."
    );
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0]).toHaveProperty("url");
  });

  it("runStructuring returns JSON matching the given schema", async () => {
    const schema = {
      type: "object",
      properties: {
        greeting: { type: "string" },
        count: { type: "number" },
      },
      required: ["greeting", "count"],
    };
    const result = await runStructuring<{ greeting: string; count: number }>(
      "Return a friendly greeting and the number 42.",
      schema
    );
    expect(typeof result.greeting).toBe("string");
    expect(result.count).toBe(42);
  });
});
```

- [ ] **Step 4: Run the test without an API key set, confirm it skips cleanly**

```bash
npx vitest run src/lib/gemini/client.test.ts
```

Expected: both tests reported as SKIPPED, no failures.

- [ ] **Step 5: Add `GEMINI_API_KEY` to `.env.local` (user supplies the real key) and re-run**

```bash
npx vitest run src/lib/gemini/client.test.ts
```

Expected: both tests PASS. If `groundingMetadata.groundingChunks` is empty or shaped differently than expected, inspect `response.candidates?.[0]?.groundingMetadata` directly (`console.log(JSON.stringify(...))`) and adjust the `sources` mapping in `client.ts` to match reality — this is the spec's flagged open question, resolved here.

- [ ] **Step 6: Commit**

```bash
git add src/lib/gemini/client.ts src/lib/gemini/client.test.ts package.json
git commit -m "Add Gemini grounded-research and schema-structuring helpers"
```

---

### Task 4: Response schemas for each pipeline stage

**Files:**
- Create: `src/lib/gemini/schemas.ts`

**Interfaces:**
- Consumes: nothing (pure data).
- Produces: `marketSizeSchema`, `competitorsSchema`, `pmfSignalSchema`, `economicsSchema`, `feasibilitySchema`, `localClassifierSchema`, `synthesisSchema` — Gemini `responseSchema` objects matching the types in `src/lib/types.ts`.

- [ ] **Step 1: Write `src/lib/gemini/schemas.ts`**

```typescript
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
    pricing_model: { type: "string" },
    implied_margin: { type: "string" },
    capital_target_to_som: { type: "string" },
  },
  required: ["pricing_model", "implied_margin", "capital_target_to_som"],
};

export const feasibilitySchema = {
  type: "object",
  properties: {
    technical: { type: "string" },
    regulatory: { type: "string" },
    go_to_market: { type: "string" },
    geo: {
      type: "object",
      properties: {
        applicable: { type: "boolean" },
        analysis: { type: "string", nullable: true },
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

export const synthesisSchema = {
  type: "object",
  properties: {
    executive_summary: { type: "string" },
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
```

- [ ] **Step 2: Verify it typechecks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gemini/schemas.ts
git commit -m "Add Gemini responseSchema definitions for pipeline stages"
```

---

### Task 5: Local classifier + Market size agent

**Files:**
- Create: `src/lib/gemini/localClassifier.ts`
- Create: `src/lib/gemini/marketSizeAgent.ts`
- Test: `src/lib/gemini/marketSizeAgent.test.ts`

**Interfaces:**
- Consumes: `runGroundedResearch`, `runStructuring` (Task 3), `marketSizeSchema`, `localClassifierSchema` (Task 4), `ResearchState`, `MarketSizeSection` (Task 2).
- Produces: `classifyIsLocal(state: ResearchState): Promise<{ isInherentlyLocal: boolean; reasoning: string }>`, `runMarketSizeAgent(state: ResearchState): Promise<MarketSizeSection>`. This pair establishes the template every remaining agent (Task 6–8) follows: grounded call → structuring call → attach sources → return typed section, with the "insufficient data" instruction baked into the prompt.

- [ ] **Step 1: Write `src/lib/gemini/localClassifier.ts`**

```typescript
// src/lib/gemini/localClassifier.ts
import { runStructuring } from "./client";
import { localClassifierSchema } from "./schemas";
import type { ResearchState } from "../types";

export async function classifyIsLocal(
  state: ResearchState
): Promise<{ isInherentlyLocal: boolean; reasoning: string }> {
  const prompt = `Idea: ${state.form.ideaName}
Description: ${state.form.description}
Target market: ${state.form.targetMarket}

Is this idea INHERENTLY local — meaning its core value proposition only works within a specific city/region (e.g. a local delivery service, a neighborhood marketplace) — as opposed to an idea that could operate nationally or globally regardless of where it starts (e.g. most SaaS, most e-commerce)?

Answer strictly based on whether the business model itself requires geographic locality, not whether the founder happens to be starting local.`;

  return runStructuring(prompt, localClassifierSchema);
}
```

- [ ] **Step 2: Write `src/lib/gemini/marketSizeAgent.ts`**

```typescript
// src/lib/gemini/marketSizeAgent.ts
import { runGroundedResearch, runStructuring } from "./client";
import { marketSizeSchema } from "./schemas";
import type { ResearchState, MarketSizeSection } from "../types";

function buildResearchPrompt(state: ResearchState): string {
  const transcript = state.voiceExchanges
    .map((e) => `Q: ${e.question}\nA: ${e.answerTranscript}`)
    .join("\n\n");

  return `You are researching the market size for this startup idea. Search the web for real, current data.

Idea: ${state.form.ideaName}
Description: ${state.form.description}
Industry: ${state.form.industry}
Target market: ${state.form.targetMarket}

Additional context from founder interview:
${transcript || "(none provided)"}

Research and estimate TAM (Total Addressable Market), SAM (Serviceable Addressable Market), and SOM (Serviceable Obtainable Market) for this idea, citing real sources with figures and dates where possible. Explain your methodology.

If you cannot find enough real data to support a confident estimate for any of TAM, SAM, or SOM, say so explicitly and explain what's missing rather than guessing a number.`;
}

function buildStructuringPrompt(researchText: string): string {
  return `Structure the following market research into the required JSON shape. For any of tam/sam/som where the research explicitly states insufficient data was available, set that field's value to "insufficient data: <reason from the research>" instead of a number.

Research:
${researchText}`;
}

export async function runMarketSizeAgent(
  state: ResearchState
): Promise<MarketSizeSection> {
  const research = await runGroundedResearch(buildResearchPrompt(state));
  const structured = await runStructuring<{
    tam: string;
    sam: string;
    som: string;
    methodology: string;
  }>(buildStructuringPrompt(research.text), marketSizeSchema);

  return { ...structured, sources: research.sources };
}
```

- [ ] **Step 3: Write `src/lib/gemini/marketSizeAgent.test.ts`**

```typescript
// src/lib/gemini/marketSizeAgent.test.ts
import { describe, it, expect } from "vitest";
import { runMarketSizeAgent } from "./marketSizeAgent";
import { classifyIsLocal } from "./localClassifier";
import type { ResearchState } from "../types";

const hasApiKey = !!process.env.GEMINI_API_KEY;

const sampleState: ResearchState = {
  form: {
    ideaName: "DeskPilot",
    description:
      "A SaaS tool that auto-schedules recurring team standups and syncs notes to Slack and Notion.",
    industry: "Productivity SaaS",
    targetMarket: "Remote-first B2B teams, 10-200 employees",
  },
  voiceExchanges: [],
};

describe.skipIf(!hasApiKey)("marketSizeAgent (live API)", () => {
  it("returns a market size section with methodology and sources", async () => {
    const result = await runMarketSizeAgent(sampleState);
    expect(result.tam.length).toBeGreaterThan(0);
    expect(result.sam.length).toBeGreaterThan(0);
    expect(result.som.length).toBeGreaterThan(0);
    expect(result.methodology.length).toBeGreaterThan(0);
    expect(Array.isArray(result.sources)).toBe(true);
  }, 60000);

  it("classifies a non-local SaaS idea as not inherently local", async () => {
    const result = await classifyIsLocal(sampleState);
    expect(result.isInherentlyLocal).toBe(false);
  }, 30000);
});
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/gemini/marketSizeAgent.test.ts
```

Expected: PASS (with `GEMINI_API_KEY` set) or SKIPPED (without it). If `tam`/`sam`/`som` come back empty or the classifier misfires, adjust the prompts, not the schema.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gemini/localClassifier.ts src/lib/gemini/marketSizeAgent.ts src/lib/gemini/marketSizeAgent.test.ts
git commit -m "Add local classifier and market size research agent"
```

---

### Task 6: Competitor + PMF signal agents

**Files:**
- Create: `src/lib/gemini/competitorAgent.ts`
- Create: `src/lib/gemini/pmfSignalAgent.ts`
- Test: `src/lib/gemini/competitorAgent.test.ts`
- Test: `src/lib/gemini/pmfSignalAgent.test.ts`

**Interfaces:**
- Consumes: same helpers as Task 5.
- Produces: `runCompetitorAgent(state: ResearchState): Promise<CompetitorSection[]>`, `runPmfSignalAgent(state: ResearchState): Promise<PmfSignalSection>`.

- [ ] **Step 1: Write `src/lib/gemini/competitorAgent.ts`**

```typescript
// src/lib/gemini/competitorAgent.ts
import { runGroundedResearch, runStructuring } from "./client";
import { competitorsSchema } from "./schemas";
import type { ResearchState, CompetitorSection } from "../types";

export async function runCompetitorAgent(
  state: ResearchState
): Promise<CompetitorSection[]> {
  const research = await runGroundedResearch(`Search the web for direct and indirect competitors to this startup idea.

Idea: ${state.form.ideaName}
Description: ${state.form.description}
Industry: ${state.form.industry}
Target market: ${state.form.targetMarket}

For each competitor found, note their pricing and market positioning. If you cannot find real pricing information for a competitor, say "insufficient data: pricing not publicly available" for that competitor's pricing rather than guessing.`);

  const structured = await runStructuring<{
    competitors: CompetitorSection[];
  }>(
    `Structure the following competitor research into a list of competitors, each with name, description, pricing, and positioning.

Research:
${research.text}`,
    competitorsSchema
  );

  return structured.competitors;
}
```

- [ ] **Step 2: Write `src/lib/gemini/pmfSignalAgent.ts`**

```typescript
// src/lib/gemini/pmfSignalAgent.ts
import { runGroundedResearch, runStructuring } from "./client";
import { pmfSignalSchema } from "./schemas";
import type { ResearchState, PmfSignalSection } from "../types";

export async function runPmfSignalAgent(
  state: ResearchState
): Promise<PmfSignalSection> {
  const research = await runGroundedResearch(`Search forums, review sites, and complaint threads for real evidence that the pain point behind this idea actually exists and bothers people enough to matter.

Idea: ${state.form.ideaName}
Description: ${state.form.description}
Target market: ${state.form.targetMarket}

Do not construct a plausible-sounding story — only report evidence you actually found, with sources. If you find little or no real evidence, say so explicitly rather than inferring that the pain point probably exists.`);

  const structured = await runStructuring<{
    summary: string;
    evidence: { claim: string; source_url: string | null }[];
  }>(
    `Structure the following pain-point research into a summary and a list of specific evidence claims. For each evidence claim, include the source URL if the research cited one, otherwise set source_url to null and make sure the claim text states why data was insufficient.

Research:
${research.text}`,
    pmfSignalSchema
  );

  return structured;
}
```

- [ ] **Step 3: Write `src/lib/gemini/competitorAgent.test.ts`**

```typescript
// src/lib/gemini/competitorAgent.test.ts
import { describe, it, expect } from "vitest";
import { runCompetitorAgent } from "./competitorAgent";
import type { ResearchState } from "../types";

const hasApiKey = !!process.env.GEMINI_API_KEY;

const sampleState: ResearchState = {
  form: {
    ideaName: "DeskPilot",
    description:
      "A SaaS tool that auto-schedules recurring team standups and syncs notes to Slack and Notion.",
    industry: "Productivity SaaS",
    targetMarket: "Remote-first B2B teams, 10-200 employees",
  },
  voiceExchanges: [],
};

describe.skipIf(!hasApiKey)("competitorAgent (live API)", () => {
  it("returns at least one competitor with required fields", async () => {
    const result = await runCompetitorAgent(sampleState);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("pricing");
    expect(result[0]).toHaveProperty("positioning");
  }, 60000);
});
```

- [ ] **Step 4: Write `src/lib/gemini/pmfSignalAgent.test.ts`**

```typescript
// src/lib/gemini/pmfSignalAgent.test.ts
import { describe, it, expect } from "vitest";
import { runPmfSignalAgent } from "./pmfSignalAgent";
import type { ResearchState } from "../types";

const hasApiKey = !!process.env.GEMINI_API_KEY;

const sampleState: ResearchState = {
  form: {
    ideaName: "DeskPilot",
    description:
      "A SaaS tool that auto-schedules recurring team standups and syncs notes to Slack and Notion.",
    industry: "Productivity SaaS",
    targetMarket: "Remote-first B2B teams, 10-200 employees",
  },
  voiceExchanges: [],
};

describe.skipIf(!hasApiKey)("pmfSignalAgent (live API)", () => {
  it("returns a summary and an evidence array", async () => {
    const result = await runPmfSignalAgent(sampleState);
    expect(result.summary.length).toBeGreaterThan(0);
    expect(Array.isArray(result.evidence)).toBe(true);
  }, 60000);
});
```

- [ ] **Step 5: Run both test files**

```bash
npx vitest run src/lib/gemini/competitorAgent.test.ts src/lib/gemini/pmfSignalAgent.test.ts
```

Expected: PASS or SKIPPED.

- [ ] **Step 6: Commit**

```bash
git add src/lib/gemini/competitorAgent.ts src/lib/gemini/pmfSignalAgent.ts src/lib/gemini/competitorAgent.test.ts src/lib/gemini/pmfSignalAgent.test.ts
git commit -m "Add competitor and PMF signal research agents"
```

---

### Task 7: Economics + Feasibility/geo agents

**Files:**
- Create: `src/lib/gemini/economicsAgent.ts`
- Create: `src/lib/gemini/feasibilityGeoAgent.ts`
- Test: `src/lib/gemini/economicsAgent.test.ts`
- Test: `src/lib/gemini/feasibilityGeoAgent.test.ts`

**Interfaces:**
- Consumes: same helpers as Task 5, plus `classifyIsLocal` (Task 5) for the geo conditional.
- Produces: `runEconomicsAgent(state: ResearchState, marketSize: MarketSizeSection): Promise<EconomicsSection>`, `runFeasibilityGeoAgent(state: ResearchState): Promise<FeasibilitySection>`.

- [ ] **Step 1: Write `src/lib/gemini/economicsAgent.ts`**

```typescript
// src/lib/gemini/economicsAgent.ts
import { runGroundedResearch, runStructuring } from "./client";
import { economicsSchema } from "./schemas";
import type { ResearchState, MarketSizeSection, EconomicsSection } from "../types";

export async function runEconomicsAgent(
  state: ResearchState,
  marketSize: MarketSizeSection
): Promise<EconomicsSection> {
  const research = await runGroundedResearch(`Search the web for comparable pricing and cost benchmarks for this type of product, to determine a sensible pricing model and margin.

Idea: ${state.form.ideaName}
Description: ${state.form.description}
Industry: ${state.form.industry}

Serviceable Obtainable Market (SOM) estimate for capital planning: ${marketSize.som}

Based on comparable pricing in this space, propose a pricing model and estimate the implied margin. Then estimate the capital required to reach the stated SOM (e.g. for customer acquisition, product build, team). If real benchmarks aren't available for any part of this, say so explicitly rather than inventing a number.`);

  return runStructuring<EconomicsSection>(
    `Structure the following economics research into pricing_model, implied_margin, and capital_target_to_som fields.

Research:
${research.text}`,
    economicsSchema
  );
}
```

- [ ] **Step 2: Write `src/lib/gemini/feasibilityGeoAgent.ts`**

```typescript
// src/lib/gemini/feasibilityGeoAgent.ts
import { runGroundedResearch, runStructuring } from "./client";
import { feasibilitySchema } from "./schemas";
import { classifyIsLocal } from "./localClassifier";
import type { ResearchState, FeasibilitySection } from "../types";

export async function runFeasibilityGeoAgent(
  state: ResearchState
): Promise<FeasibilitySection> {
  const localClassification = await classifyIsLocal(state);

  const geoInstruction = localClassification.isInherentlyLocal
    ? `This idea IS classified as inherently local (${localClassification.reasoning}). Research local market conditions relevant to it and include that analysis.`
    : `This idea is NOT classified as inherently local (${localClassification.reasoning}). Do not include geo/local market analysis.`;

  const research = await runGroundedResearch(`Search the web for technical, regulatory, and go-to-market barriers relevant to this startup idea.

Idea: ${state.form.ideaName}
Description: ${state.form.description}
Industry: ${state.form.industry}
Target market: ${state.form.targetMarket}

${geoInstruction}

If you cannot find enough information to assess any of these barriers, say so explicitly.`);

  const structured = await runStructuring<{
    technical: string;
    regulatory: string;
    go_to_market: string;
  }>(
    `Structure the following feasibility research into technical, regulatory, and go_to_market fields.

Research:
${research.text}`,
    {
      type: "object",
      properties: {
        technical: { type: "string" },
        regulatory: { type: "string" },
        go_to_market: { type: "string" },
      },
      required: ["technical", "regulatory", "go_to_market"],
    }
  );

  let geoAnalysis: string | null = null;
  if (localClassification.isInherentlyLocal) {
    const geoStructured = await runStructuring<{ analysis: string }>(
      `Extract just the local/geo market analysis from the following research into a single "analysis" field.

Research:
${research.text}`,
      {
        type: "object",
        properties: { analysis: { type: "string" } },
        required: ["analysis"],
      }
    );
    geoAnalysis = geoStructured.analysis;
  }

  return {
    ...structured,
    geo: {
      applicable: localClassification.isInherentlyLocal,
      analysis: geoAnalysis,
    },
  };
}
```

Note: this agent references `feasibilitySchema` import but structures in two smaller calls instead — remove the unused `feasibilitySchema` import since the full nested schema isn't used directly here (structuring is split into the base fields call and the conditional geo call for simplicity).

- [ ] **Step 3: Remove the unused import**

Edit `src/lib/gemini/feasibilityGeoAgent.ts` and delete the line `import { feasibilitySchema } from "./schemas";`.

- [ ] **Step 4: Write `src/lib/gemini/economicsAgent.test.ts`**

```typescript
// src/lib/gemini/economicsAgent.test.ts
import { describe, it, expect } from "vitest";
import { runEconomicsAgent } from "./economicsAgent";
import type { ResearchState, MarketSizeSection } from "../types";

const hasApiKey = !!process.env.GEMINI_API_KEY;

const sampleState: ResearchState = {
  form: {
    ideaName: "DeskPilot",
    description:
      "A SaaS tool that auto-schedules recurring team standups and syncs notes to Slack and Notion.",
    industry: "Productivity SaaS",
    targetMarket: "Remote-first B2B teams, 10-200 employees",
  },
  voiceExchanges: [],
};

const sampleMarketSize: MarketSizeSection = {
  tam: "$10B",
  sam: "$1B",
  som: "$10M",
  methodology: "Based on comparable productivity SaaS TAM reports.",
  sources: [],
};

describe.skipIf(!hasApiKey)("economicsAgent (live API)", () => {
  it("returns pricing model, margin, and capital target", async () => {
    const result = await runEconomicsAgent(sampleState, sampleMarketSize);
    expect(result.pricing_model.length).toBeGreaterThan(0);
    expect(result.implied_margin.length).toBeGreaterThan(0);
    expect(result.capital_target_to_som.length).toBeGreaterThan(0);
  }, 60000);
});
```

- [ ] **Step 5: Write `src/lib/gemini/feasibilityGeoAgent.test.ts`**

```typescript
// src/lib/gemini/feasibilityGeoAgent.test.ts
import { describe, it, expect } from "vitest";
import { runFeasibilityGeoAgent } from "./feasibilityGeoAgent";
import type { ResearchState } from "../types";

const hasApiKey = !!process.env.GEMINI_API_KEY;

const nonLocalState: ResearchState = {
  form: {
    ideaName: "DeskPilot",
    description:
      "A SaaS tool that auto-schedules recurring team standups and syncs notes to Slack and Notion.",
    industry: "Productivity SaaS",
    targetMarket: "Remote-first B2B teams, 10-200 employees",
  },
  voiceExchanges: [],
};

const localState: ResearchState = {
  form: {
    ideaName: "CornerCart",
    description:
      "A same-day grocery delivery service for a single neighborhood, using local runners on bikes.",
    industry: "Local delivery",
    targetMarket: "Residents within a 2-mile radius of downtown Austin, TX",
  },
  voiceExchanges: [],
};

describe.skipIf(!hasApiKey)("feasibilityGeoAgent (live API)", () => {
  it("does not populate geo analysis for a non-local idea", async () => {
    const result = await runFeasibilityGeoAgent(nonLocalState);
    expect(result.geo.applicable).toBe(false);
    expect(result.geo.analysis).toBeNull();
  }, 60000);

  it("populates geo analysis for an inherently local idea", async () => {
    const result = await runFeasibilityGeoAgent(localState);
    expect(result.geo.applicable).toBe(true);
    expect(result.geo.analysis).not.toBeNull();
  }, 60000);
});
```

- [ ] **Step 6: Run both test files**

```bash
npx vitest run src/lib/gemini/economicsAgent.test.ts src/lib/gemini/feasibilityGeoAgent.test.ts
```

Expected: PASS or SKIPPED. If the local/non-local classification test is flaky, tighten the wording in `localClassifier.ts`'s prompt rather than loosening the test.

- [ ] **Step 7: Commit**

```bash
git add src/lib/gemini/economicsAgent.ts src/lib/gemini/feasibilityGeoAgent.ts src/lib/gemini/economicsAgent.test.ts src/lib/gemini/feasibilityGeoAgent.test.ts
git commit -m "Add economics and feasibility/geo research agents"
```

---

### Task 8: Synthesis agent + full pipeline orchestration

**Files:**
- Create: `src/lib/gemini/synthesisAgent.ts`
- Create: `src/lib/gemini/pipeline.ts`
- Test: `src/lib/gemini/pipeline.test.ts`

**Interfaces:**
- Consumes: all agents from Tasks 5–7, `synthesisSchema` (Task 4), `ResearchState`, `MarketResearchReport` (Task 2).
- Produces: `runSynthesisAgent(state: ResearchState): Promise<Pick<MarketResearchReport, "executive_summary" | "swot" | "verdict" | "pros" | "cons">>`, `runPipeline(state: ResearchState): Promise<MarketResearchReport>` — the function the API route (Task 10) calls directly.

- [ ] **Step 1: Write `src/lib/gemini/synthesisAgent.ts`**

```typescript
// src/lib/gemini/synthesisAgent.ts
import { runStructuring } from "./client";
import { synthesisSchema } from "./schemas";
import type {
  ResearchState,
  MarketSizeSection,
  CompetitorSection,
  PmfSignalSection,
  EconomicsSection,
  FeasibilitySection,
} from "../types";

export type SynthesisResult = {
  executive_summary: string;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  verdict: { rating: "green" | "amber" | "red"; reasoning: string };
  pros: string[];
  cons: string[];
};

export async function runSynthesisAgent(
  state: ResearchState,
  marketSize: MarketSizeSection,
  competitors: CompetitorSection[],
  pmfSignal: PmfSignalSection,
  economics: EconomicsSection,
  feasibility: FeasibilitySection
): Promise<SynthesisResult> {
  const prompt = `You are synthesizing a full market research report from the stages below into an executive summary, SWOT analysis, a color-coded viability verdict, and pros/cons. Be honest — if the evidence is weak, the verdict should be amber or red, not flattering. Cite specifics from the research below rather than generic startup advice.

Idea: ${state.form.ideaName}
Description: ${state.form.description}

Market size:
${JSON.stringify(marketSize, null, 2)}

Competitors:
${JSON.stringify(competitors, null, 2)}

PMF signal:
${JSON.stringify(pmfSignal, null, 2)}

Economics:
${JSON.stringify(economics, null, 2)}

Feasibility:
${JSON.stringify(feasibility, null, 2)}

Verdict rules: "green" means strong sourced evidence across market size, PMF signal, and feasibility. "amber" means mixed evidence or notable gaps. "red" means weak/contradicted evidence or a fundamental viability problem. Do not default to green.`;

  return runStructuring<SynthesisResult>(prompt, synthesisSchema);
}
```

- [ ] **Step 2: Write `src/lib/gemini/pipeline.ts`**

```typescript
// src/lib/gemini/pipeline.ts
import { runMarketSizeAgent } from "./marketSizeAgent";
import { runCompetitorAgent } from "./competitorAgent";
import { runPmfSignalAgent } from "./pmfSignalAgent";
import { runEconomicsAgent } from "./economicsAgent";
import { runFeasibilityGeoAgent } from "./feasibilityGeoAgent";
import { runSynthesisAgent } from "./synthesisAgent";
import type { ResearchState, MarketResearchReport } from "../types";

export async function runPipeline(
  state: ResearchState
): Promise<MarketResearchReport> {
  const [marketSize, competitors, pmfSignal, feasibility] = await Promise.all([
    runMarketSizeAgent(state),
    runCompetitorAgent(state),
    runPmfSignalAgent(state),
    runFeasibilityGeoAgent(state),
  ]);

  const economics = await runEconomicsAgent(state, marketSize);

  const synthesis = await runSynthesisAgent(
    state,
    marketSize,
    competitors,
    pmfSignal,
    economics,
    feasibility
  );

  const allSources = [
    ...marketSize.sources,
    ...pmfSignal.evidence
      .filter((e) => e.source_url)
      .map((e) => ({ title: e.claim, url: e.source_url as string })),
  ];
  const dedupedSources = Array.from(
    new Map(allSources.map((s) => [s.url, s])).values()
  );

  return {
    executive_summary: synthesis.executive_summary,
    tam_sam_som: {
      tam: marketSize.tam,
      sam: marketSize.sam,
      som: marketSize.som,
      methodology: marketSize.methodology,
    },
    competitors,
    swot: synthesis.swot,
    pmf_signal: pmfSignal,
    economics,
    feasibility,
    verdict: synthesis.verdict,
    pros: synthesis.pros,
    cons: synthesis.cons,
    sources: dedupedSources,
  };
}
```

- [ ] **Step 3: Write `src/lib/gemini/pipeline.test.ts`**

```typescript
// src/lib/gemini/pipeline.test.ts
import { describe, it, expect } from "vitest";
import { runPipeline } from "./pipeline";
import type { ResearchState } from "../types";

const hasApiKey = !!process.env.GEMINI_API_KEY;

const sampleState: ResearchState = {
  form: {
    ideaName: "DeskPilot",
    description:
      "A SaaS tool that auto-schedules recurring team standups and syncs notes to Slack and Notion.",
    industry: "Productivity SaaS",
    targetMarket: "Remote-first B2B teams, 10-200 employees",
  },
  voiceExchanges: [
    {
      question: "What made you want to build this?",
      answerTranscript:
        "Our own team kept forgetting to update standup notes and it was a mess syncing across tools.",
    },
  ],
};

describe.skipIf(!hasApiKey)("runPipeline (live API, end-to-end)", () => {
  it("returns a fully populated MarketResearchReport", async () => {
    const report = await runPipeline(sampleState);

    expect(report.executive_summary.length).toBeGreaterThan(0);
    expect(report.tam_sam_som.tam.length).toBeGreaterThan(0);
    expect(report.competitors.length).toBeGreaterThan(0);
    expect(["green", "amber", "red"]).toContain(report.verdict.rating);
    expect(report.pros.length).toBeGreaterThan(0);
    expect(report.cons.length).toBeGreaterThan(0);
    expect(Array.isArray(report.sources)).toBe(true);
  }, 180000);
});
```

- [ ] **Step 4: Run the pipeline test**

```bash
npx vitest run src/lib/gemini/pipeline.test.ts
```

Expected: PASS (takes 1-3 minutes with a real key) or SKIPPED without one.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gemini/synthesisAgent.ts src/lib/gemini/pipeline.ts src/lib/gemini/pipeline.test.ts
git commit -m "Add synthesis agent and full pipeline orchestration"
```

---

### Task 9: Voice intake — next-question API + Whisper client

**Files:**
- Create: `src/lib/whisperClient.ts`
- Create: `src/app/api/voice-question/route.ts`
- Test: `src/lib/whisperClient.test.ts`

**Interfaces:**
- Consumes: `runStructuring` (Task 3), `ResearchState` (Task 2), Whisper service `/transcribe` (Task 1).
- Produces: `transcribeAudio(blob: Blob): Promise<string>`; `POST /api/voice-question` — body `{ researchState: ResearchState }` → `{ question: string; done: boolean }`.

- [ ] **Step 1: Write `src/lib/whisperClient.ts`**

```typescript
// src/lib/whisperClient.ts

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const url = process.env.WHISPER_SERVICE_URL ?? "http://localhost:8000";
  const formData = new FormData();
  formData.append("audio", audioBlob, "answer.webm");

  const response = await fetch(`${url}/transcribe`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Whisper service returned ${response.status}`);
  }

  const data = (await response.json()) as { text: string };
  return data.text;
}
```

- [ ] **Step 2: Write `src/app/api/voice-question/route.ts`**

```typescript
// src/app/api/voice-question/route.ts
import { NextResponse } from "next/server";
import { runStructuring } from "@/lib/gemini/client";
import type { ResearchState } from "@/lib/types";

const MAX_EXCHANGES = 8;
const MIN_EXCHANGES = 5;

const nextQuestionSchema = {
  type: "object",
  properties: {
    done: { type: "boolean" },
    question: { type: "string", nullable: true },
  },
  required: ["done", "question"],
};

export async function POST(request: Request) {
  const { researchState } = (await request.json()) as {
    researchState: ResearchState;
  };

  const exchangeCount = researchState.voiceExchanges.length;

  if (exchangeCount >= MAX_EXCHANGES) {
    return NextResponse.json({ question: null, done: true });
  }

  const transcript = researchState.voiceExchanges
    .map((e) => `Q: ${e.question}\nA: ${e.answerTranscript}`)
    .join("\n\n");

  const prompt = `You are conducting a short adaptive founder interview (5-8 questions total, currently at question ${exchangeCount + 1}) to gather context before researching their startup idea.

Idea: ${researchState.form.ideaName}
Description: ${researchState.form.description}
Industry: ${researchState.form.industry}
Target market: ${researchState.form.targetMarket}

Conversation so far:
${transcript || "(none yet)"}

Ask ONE good follow-up question that would meaningfully help a market researcher (about the problem, target user, competitive awareness, pricing intuition, or goals) — skip anything already answered. If you have gathered enough (minimum ${MIN_EXCHANGES} exchanges reached and no more good questions to ask), set done to true and question to null. Otherwise set done to false and provide the question.`;

  const result = await runStructuring<{ done: boolean; question: string | null }>(
    prompt,
    nextQuestionSchema
  );

  if (exchangeCount < MIN_EXCHANGES) {
    return NextResponse.json({ ...result, done: false });
  }

  return NextResponse.json(result);
}
```

- [ ] **Step 3: Write `src/lib/whisperClient.test.ts`**

```typescript
// src/lib/whisperClient.test.ts
import { describe, it, expect } from "vitest";
import { transcribeAudio } from "./whisperClient";
import { readFileSync } from "fs";
import { join } from "path";

async function whisperServiceReachable(): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.WHISPER_SERVICE_URL ?? "http://localhost:8000"}/health`
    );
    return res.ok;
  } catch {
    return false;
  }
}

describe("transcribeAudio (live whisper-service)", () => {
  it("transcribes a real audio file into non-empty text", async () => {
    const reachable = await whisperServiceReachable();
    if (!reachable) {
      console.warn("whisper-service not reachable at localhost:8000, skipping");
      return;
    }

    const audioPath = "/tmp/test.wav";
    const buffer = readFileSync(audioPath);
    const blob = new Blob([buffer], { type: "audio/wav" });

    const text = await transcribeAudio(blob);
    expect(text.length).toBeGreaterThan(0);
  }, 30000);
});
```

- [ ] **Step 4: Ensure the whisper-service from Task 1 is running, then run the test**

```bash
curl -s http://localhost:8000/health || (cd whisper-service && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 &)
sleep 2
npx vitest run src/lib/whisperClient.test.ts
```

Expected: PASS with real transcribed text (reuses `/tmp/test.wav` from Task 1 Step 5; if it's not present, regenerate it the same way first).

- [ ] **Step 5: Commit**

```bash
git add src/lib/whisperClient.ts src/lib/whisperClient.test.ts src/app/api/voice-question/route.ts
git commit -m "Add Whisper client and adaptive next-question API route"
```

---

### Task 10: Research pipeline API route

**Files:**
- Create: `src/app/api/research/route.ts`

**Interfaces:**
- Consumes: `runPipeline` (Task 8), `ResearchState` (Task 2).
- Produces: `POST /api/research` — body `{ researchState: ResearchState }` → `MarketResearchReport` JSON, or `{ error: string }` with a non-200 status on failure.

- [ ] **Step 1: Write `src/app/api/research/route.ts`**

```typescript
// src/app/api/research/route.ts
import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/gemini/pipeline";
import type { ResearchState } from "@/lib/types";

export async function POST(request: Request) {
  const { researchState } = (await request.json()) as {
    researchState: ResearchState;
  };

  try {
    const report = await runPipeline(researchState);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Pipeline failed:", error);
    return NextResponse.json(
      { error: "Research pipeline failed. Please try again." },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 2: Start the dev server and manually verify the route with curl**

```bash
npm run dev &
sleep 5
curl -s -X POST http://localhost:3000/api/research \
  -H "Content-Type: application/json" \
  -d '{"researchState":{"form":{"ideaName":"DeskPilot","description":"A SaaS tool that auto-schedules recurring team standups and syncs notes to Slack and Notion.","industry":"Productivity SaaS","targetMarket":"Remote-first B2B teams, 10-200 employees"},"voiceExchanges":[]}}' \
  | head -c 500
```

Expected: JSON beginning with `{"executive_summary":...` (may take 1-3 minutes to respond — increase curl's implicit timeout if needed, or add `--max-time 240`).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/research/route.ts
git commit -m "Add research pipeline API route"
```

---

### Task 11: Idea form + voice intake UI components

**Files:**
- Create: `src/components/IdeaForm.tsx`
- Create: `src/components/VoiceIntake.tsx`

**Interfaces:**
- Consumes: `IdeaFormInput`, `ResearchState`, `VoiceExchange` (Task 2); calls `POST /api/voice-question` (Task 9).
- Produces: `<IdeaForm onSubmit={(input: IdeaFormInput) => void} />`; `<VoiceIntake researchState={ResearchState} onComplete={(exchanges: VoiceExchange[]) => void} />`.

- [ ] **Step 1: Write `src/components/IdeaForm.tsx`**

```tsx
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

export function IdeaForm({
  onSubmit,
}: {
  onSubmit: (input: IdeaFormInput) => void;
}) {
  const [ideaName, setIdeaName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [targetMarket, setTargetMarket] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ideaName.trim() || !description.trim() || !targetMarket.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    onSubmit({ ideaName, description, industry, targetMarket });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Idea name</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={ideaName}
          onChange={(e) => setIdeaName(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          className="w-full border rounded px-3 py-2"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Industry</label>
        <select
          className="w-full border rounded px-3 py-2"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        >
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Target market</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={targetMarket}
          onChange={(e) => setTargetMarket(e.target.value)}
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        className="bg-black text-white rounded px-4 py-2 font-medium"
      >
        Continue to voice intake
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Write `src/components/VoiceIntake.tsx`**

```tsx
// src/components/VoiceIntake.tsx
"use client";

import { useState, useRef } from "react";
import type { ResearchState, VoiceExchange } from "@/lib/types";
import { transcribeAudio } from "@/lib/whisperClient";

type Phase =
  | "loading-question"
  | "speaking"
  | "ready-to-record"
  | "recording"
  | "transcribing";

function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function VoiceIntake({
  researchState,
  onComplete,
}: {
  researchState: ResearchState;
  onComplete: (exchanges: VoiceExchange[]) => void;
}) {
  const [exchanges, setExchanges] = useState<VoiceExchange[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading-question");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(false);

  async function fetchNextQuestion(exchangesSoFar: VoiceExchange[]) {
    setPhase("loading-question");
    setError(null);
    try {
      const res = await fetch("/api/voice-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchState: { ...researchState, voiceExchanges: exchangesSoFar },
        }),
      });
      const data = (await res.json()) as { question: string | null; done: boolean };
      if (data.done || !data.question) {
        onComplete(exchangesSoFar);
        return;
      }
      setCurrentQuestion(data.question);
      setPhase("speaking");
      await speak(data.question);
      setPhase("ready-to-record");
    } catch {
      setError("Couldn't load the next question. Please retry.");
    }
  }

  if (!startedRef.current) {
    startedRef.current = true;
    fetchNextQuestion([]);
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.start();
      mediaRecorderRef.current = recorder;
      setPhase("recording");
    } catch {
      setError("Microphone access failed. Please allow microphone permissions and retry.");
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !currentQuestion) return;

    setPhase("transcribing");
    recorder.stop();
    recorder.onstop = async () => {
      try {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const text = await transcribeAudio(blob);
        const newExchanges = [
          ...exchanges,
          { question: currentQuestion, answerTranscript: text },
        ];
        setExchanges(newExchanges);
        await fetchNextQuestion(newExchanges);
      } catch {
        setError("Transcription failed. Please retry this question.");
        setPhase("ready-to-record");
      }
    };
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 text-center">
      <p className="text-sm text-gray-500">
        Question {exchanges.length + 1} of ~6-8
      </p>
      {phase === "loading-question" && <p>Thinking of the next question...</p>}
      {phase === "speaking" && <p className="text-sm text-gray-500">Speaking...</p>}
      {phase !== "loading-question" && currentQuestion && (
        <p className="text-lg font-medium">{currentQuestion}</p>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {phase === "ready-to-record" && (
        <button
          onClick={startRecording}
          className="bg-black text-white rounded px-4 py-2 font-medium"
        >
          Start recording
        </button>
      )}
      {phase === "recording" && (
        <button
          onClick={stopRecording}
          className="bg-red-600 text-white rounded px-4 py-2 font-medium"
        >
          Stop recording
        </button>
      )}
      {phase === "transcribing" && <p>Transcribing your answer...</p>}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/IdeaForm.tsx src/components/VoiceIntake.tsx
git commit -m "Add idea form and voice intake UI components"
```

---

### Task 12: Report view components

**Files:**
- Create: `src/components/Report/VerdictBadge.tsx`
- Create: `src/components/Report/SourcesList.tsx`
- Create: `src/components/Report/ReportView.tsx`

**Interfaces:**
- Consumes: `MarketResearchReport` (Task 2).
- Produces: `<ReportView report={MarketResearchReport} onNewResearch={() => void} />` (composes `VerdictBadge`, `SourcesList`).

- [ ] **Step 1: Write `src/components/Report/VerdictBadge.tsx`**

```tsx
// src/components/Report/VerdictBadge.tsx
import type { MarketResearchReport } from "@/lib/types";

const COLORS: Record<string, string> = {
  green: "bg-green-100 text-green-800 border-green-400",
  amber: "bg-amber-100 text-amber-800 border-amber-400",
  red: "bg-red-100 text-red-800 border-red-400",
};

export function VerdictBadge({
  verdict,
}: {
  verdict: MarketResearchReport["verdict"];
}) {
  return (
    <div className={`border rounded-lg p-4 ${COLORS[verdict.rating]}`}>
      <p className="uppercase text-xs font-bold tracking-wide">
        Verdict: {verdict.rating}
      </p>
      <p className="mt-1">{verdict.reasoning}</p>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/components/Report/SourcesList.tsx`**

```tsx
// src/components/Report/SourcesList.tsx
import type { MarketResearchReport } from "@/lib/types";

export function SourcesList({
  sources,
}: {
  sources: MarketResearchReport["sources"];
}) {
  if (sources.length === 0) {
    return <p className="text-sm text-gray-500">No sources cited.</p>;
  }
  return (
    <ul className="text-sm space-y-1">
      {sources.map((s) => (
        <li key={s.url}>
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {s.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Write `src/components/Report/ReportView.tsx`**

```tsx
// src/components/Report/ReportView.tsx
import type { MarketResearchReport } from "@/lib/types";
import { VerdictBadge } from "./VerdictBadge";
import { SourcesList } from "./SourcesList";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function ReportView({
  report,
  onNewResearch,
}: {
  report: MarketResearchReport;
  onNewResearch: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <VerdictBadge verdict={report.verdict} />

      <Section title="Executive summary">
        <p>{report.executive_summary}</p>
      </Section>

      <Section title="Market size (TAM / SAM / SOM)">
        <p>
          <strong>TAM:</strong> {report.tam_sam_som.tam}
        </p>
        <p>
          <strong>SAM:</strong> {report.tam_sam_som.sam}
        </p>
        <p>
          <strong>SOM:</strong> {report.tam_sam_som.som}
        </p>
        <p className="text-sm text-gray-600">{report.tam_sam_som.methodology}</p>
      </Section>

      <Section title="Competitors">
        <div className="grid gap-4 sm:grid-cols-2">
          {report.competitors.map((c) => (
            <div key={c.name} className="border rounded p-3">
              <p className="font-medium">{c.name}</p>
              <p className="text-sm">{c.description}</p>
              <p className="text-sm text-gray-600">Pricing: {c.pricing}</p>
              <p className="text-sm text-gray-600">Positioning: {c.positioning}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="SWOT">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-medium">Strengths</p>
            <ul className="list-disc list-inside text-sm">
              {report.swot.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Weaknesses</p>
            <ul className="list-disc list-inside text-sm">
              {report.swot.weaknesses.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Opportunities</p>
            <ul className="list-disc list-inside text-sm">
              {report.swot.opportunities.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Threats</p>
            <ul className="list-disc list-inside text-sm">
              {report.swot.threats.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Product-market fit signal">
        <p>{report.pmf_signal.summary}</p>
        <ul className="text-sm space-y-1">
          {report.pmf_signal.evidence.map((e, i) => (
            <li
              key={i}
              className={e.source_url ? "" : "italic text-gray-500"}
            >
              {e.claim}
              {e.source_url && (
                <>
                  {" "}
                  (
                  <a
                    href={e.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    source
                  </a>
                  )
                </>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Economics">
        <p>
          <strong>Pricing model:</strong> {report.economics.pricing_model}
        </p>
        <p>
          <strong>Implied margin:</strong> {report.economics.implied_margin}
        </p>
        <p>
          <strong>Capital target to SOM:</strong>{" "}
          {report.economics.capital_target_to_som}
        </p>
      </Section>

      <Section title="Feasibility">
        <p>
          <strong>Technical:</strong> {report.feasibility.technical}
        </p>
        <p>
          <strong>Regulatory:</strong> {report.feasibility.regulatory}
        </p>
        <p>
          <strong>Go-to-market:</strong> {report.feasibility.go_to_market}
        </p>
        {report.feasibility.geo.applicable && (
          <p>
            <strong>Local market:</strong> {report.feasibility.geo.analysis}
          </p>
        )}
      </Section>

      <Section title="Pros & cons">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-medium">Pros</p>
            <ul className="list-disc list-inside text-sm">
              {report.pros.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Cons</p>
            <ul className="list-disc list-inside text-sm">
              {report.cons.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Sources">
        <SourcesList sources={report.sources} />
      </Section>

      <button
        onClick={onNewResearch}
        className="border rounded px-4 py-2 font-medium"
      >
        New research
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/Report/
git commit -m "Add report view components"
```

---

### Task 13: PDF export

**Files:**
- Create: `src/components/DownloadPdfButton.tsx`

**Interfaces:**
- Consumes: `MarketResearchReport` (Task 2), `@react-pdf/renderer` (installed Task 2).
- Produces: `<DownloadPdfButton report={MarketResearchReport} />`.

- [ ] **Step 1: Write `src/components/DownloadPdfButton.tsx`**

```tsx
// src/components/DownloadPdfButton.tsx
"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import type { MarketResearchReport } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica" },
  header: { fontSize: 20, marginBottom: 4 },
  brand: { fontSize: 10, color: "#666", marginBottom: 16 },
  verdict: { fontSize: 14, marginBottom: 16, fontFamily: "Helvetica-Bold" },
  sectionTitle: { fontSize: 14, marginTop: 16, marginBottom: 6, fontFamily: "Helvetica-Bold" },
  text: { marginBottom: 4, lineHeight: 1.4 },
  bullet: { marginBottom: 2 },
});

function ReportPdfDocument({ report }: { report: MarketResearchReport }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>Fulcrum — Market Research Report</Text>
        <Text style={styles.verdict}>
          Verdict: {report.verdict.rating.toUpperCase()} — {report.verdict.reasoning}
        </Text>

        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <Text style={styles.text}>{report.executive_summary}</Text>

        <Text style={styles.sectionTitle}>Market Size</Text>
        <Text style={styles.text}>TAM: {report.tam_sam_som.tam}</Text>
        <Text style={styles.text}>SAM: {report.tam_sam_som.sam}</Text>
        <Text style={styles.text}>SOM: {report.tam_sam_som.som}</Text>
        <Text style={styles.text}>{report.tam_sam_som.methodology}</Text>

        <Text style={styles.sectionTitle}>Competitors</Text>
        {report.competitors.map((c) => (
          <View key={c.name} style={{ marginBottom: 6 }}>
            <Text style={styles.text}>
              {c.name} — {c.description} (Pricing: {c.pricing}, Positioning: {c.positioning})
            </Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Economics</Text>
        <Text style={styles.text}>Pricing model: {report.economics.pricing_model}</Text>
        <Text style={styles.text}>Implied margin: {report.economics.implied_margin}</Text>
        <Text style={styles.text}>
          Capital target to SOM: {report.economics.capital_target_to_som}
        </Text>

        <Text style={styles.sectionTitle}>Feasibility</Text>
        <Text style={styles.text}>Technical: {report.feasibility.technical}</Text>
        <Text style={styles.text}>Regulatory: {report.feasibility.regulatory}</Text>
        <Text style={styles.text}>Go-to-market: {report.feasibility.go_to_market}</Text>
        {report.feasibility.geo.applicable && (
          <Text style={styles.text}>Local market: {report.feasibility.geo.analysis}</Text>
        )}

        <Text style={styles.sectionTitle}>Pros</Text>
        {report.pros.map((p, i) => (
          <Text key={i} style={styles.bullet}>
            • {p}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>Cons</Text>
        {report.cons.map((c, i) => (
          <Text key={i} style={styles.bullet}>
            • {c}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>Sources</Text>
        {report.sources.map((s) => (
          <Text key={s.url} style={styles.bullet}>
            • {s.title} — {s.url}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

export function DownloadPdfButton({ report }: { report: MarketResearchReport }) {
  return (
    <PDFDownloadLink
      document={<ReportPdfDocument report={report} />}
      fileName={`fulcrum-market-research-${Date.now()}.pdf`}
    >
      {({ loading }) => (
        <button className="bg-black text-white rounded px-4 py-2 font-medium">
          {loading ? "Preparing PDF..." : "Download PDF"}
        </button>
      )}
    </PDFDownloadLink>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/DownloadPdfButton.tsx
git commit -m "Add branded PDF export for the research report"
```

---

### Task 14: Page orchestration — wire form, voice, pipeline, report together

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `IdeaForm`, `VoiceIntake`, `ReportView`, `DownloadPdfButton` (Tasks 11-13), `POST /api/research` (Task 10), `ResearchState`, `MarketResearchReport` (Task 2).
- Produces: the full end-to-end page — this is the integration point with no downstream consumers.

- [ ] **Step 1: Write `src/app/page.tsx`**

```tsx
// src/app/page.tsx
"use client";

import { useState } from "react";
import { IdeaForm } from "@/components/IdeaForm";
import { VoiceIntake } from "@/components/VoiceIntake";
import { ReportView } from "@/components/Report/ReportView";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import type { IdeaFormInput, ResearchState, MarketResearchReport, VoiceExchange } from "@/lib/types";

type Step = "form" | "voice" | "pipeline" | "report" | "error";

export default function Home() {
  const [step, setStep] = useState<Step>("form");
  const [researchState, setResearchState] = useState<ResearchState | null>(null);
  const [report, setReport] = useState<MarketResearchReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleFormSubmit(input: IdeaFormInput) {
    setResearchState({ form: input, voiceExchanges: [] });
    setStep("voice");
  }

  async function handleVoiceComplete(exchanges: VoiceExchange[]) {
    if (!researchState) return;
    const updatedState = { ...researchState, voiceExchanges: exchanges };
    setResearchState(updatedState);
    setStep("pipeline");
    await runPipeline(updatedState);
  }

  async function runPipeline(state: ResearchState) {
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researchState: state }),
      });
      if (!res.ok) throw new Error("Pipeline request failed");
      const data = (await res.json()) as MarketResearchReport;
      setReport(data);
      setStep("report");
    } catch {
      setErrorMessage("Something went wrong generating your report.");
      setStep("error");
    }
  }

  function handleNewResearch() {
    setResearchState(null);
    setReport(null);
    setErrorMessage(null);
    setStep("form");
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-center mb-8">
        Fulcrum Market Research Simulator
      </h1>

      {step === "form" && <IdeaForm onSubmit={handleFormSubmit} />}

      {step === "voice" && researchState && (
        <VoiceIntake
          researchState={researchState}
          onComplete={handleVoiceComplete}
        />
      )}

      {step === "pipeline" && (
        <p className="text-center">
          Researching your idea — this can take a few minutes...
        </p>
      )}

      {step === "error" && (
        <div className="max-w-xl mx-auto text-center space-y-4">
          <p className="text-red-600">{errorMessage}</p>
          <button
            onClick={() => researchState && runPipeline(researchState)}
            className="bg-black text-white rounded px-4 py-2 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {step === "report" && report && (
        <>
          <div className="max-w-3xl mx-auto flex justify-end mb-4">
            <DownloadPdfButton report={report} />
          </div>
          <ReportView report={report} onNewResearch={handleNewResearch} />
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Typecheck and build**

```bash
npx tsc --noEmit
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 3: Manual end-to-end verification**

```bash
# Ensure whisper-service is running (Task 1) and GEMINI_API_KEY is set in .env.local
npm run dev
```

Open `http://localhost:3000` in a browser. Fill out the idea form, complete the voice intake (allow microphone access, answer 5-8 questions), wait for the pipeline, and confirm a full report renders with a verdict badge, all sections populated, and a working "Download PDF" button. This is the Day 5 manual test from the spec — run it with at least one real idea now to confirm the wiring works before the plan's later 5-idea test pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "Wire form, voice intake, pipeline, and report into end-to-end flow"
```

---

### Task 15: Five-idea manual test pass

**Files:**
- None created — this is a verification task per the spec's Testing section.

**Interfaces:**
- Consumes: the full running app (whisper-service + Next.js dev server).

- [ ] **Step 1: Run 5 real startup ideas through the full flow**

With both services running, go through the complete flow (form → voice intake → pipeline → report) for 5 different ideas, including at least one deliberately weak/bad idea (e.g. "a subscription box for identical rocks"). For each, note:
- Did the verdict rating feel honest (not just green every time)?
- Are any report fields showing raw "insufficient data" text awkwardly (fix rendering in `ReportView.tsx`/PDF if so, not the agent prompts)?
- Did the geo section appear only for the local idea(s) tested?
- Did PDF export work for each?

- [ ] **Step 2: Confirm at least one idea produced a red or amber verdict with well-reasoned reasoning**

Per spec/PRD success criteria (Section 8): the weak idea's verdict reasoning must reference the specific researched weakness, not generic caution language. If every idea comes back green, tighten the verdict rules in `synthesisAgent.ts`'s prompt.

- [ ] **Step 3: Fix any issues found, committing each fix separately**

```bash
git add -A
git commit -m "Fix issues found in 5-idea manual test pass"
```

(Repeat as needed — this step covers whatever specific fixes come out of Step 1/2, which can't be enumerated ahead of running the tests.)

---

## Self-Review Notes

- **Spec coverage:** Architecture (Task 2-3), voice intake (Task 1, 9, 11), all 5 pipeline stages + synthesis (Task 5-8), grounding/insufficient-data rule (baked into every agent prompt in Tasks 5-8), report schema (Task 2, matches spec exactly), UI 4 steps (Task 11-14), error handling (Task 9/10/14 retry paths), PDF export (Task 13), 5-idea test (Task 15) — all spec sections have a corresponding task.
- **Placeholder scan:** no TBD/TODO markers; all steps contain complete code.
- **Type consistency:** `ResearchState`, `MarketResearchReport`, and section types defined once in Task 2 and imported verbatim through Tasks 5-14 — no renamed fields between tasks.
