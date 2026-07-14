# Fulcrum Market Research Simulator — Design (Feature 1)

Supersedes the earlier single-call draft of this spec. Rewritten against `Fulcrum_Market_Research_Intelligence_Layer_PRD.docx` (2026-07-14), Feature 1 only. The Intelligence Layer (PRD Section 6, Days 6–9) is a separate tool and gets its own spec later — this covers Days 1–5.

## Purpose

Ship the Market Research Simulator: voice-assisted idea intake feeding a multi-stage, search-grounded agentic pipeline that produces a sourced, structured viability report. This is the YC demo's core artifact — it must be specific and sourced enough that a founder trusts it, not a generic templated report.

## Architecture

- **Framework:** Next.js (App Router, TypeScript), single deployable app on Vercel — handles the form UI, voice-recording UI, pipeline orchestration (API routes/server actions), and report rendering/export.
- **Voice transcription:** Separate Python microservice — FastAPI + `faster-whisper` (CTranslate2, small/base model, int8 CPU inference). Next.js cannot host this in-process (Node runtime, no Python); the API route calls it over HTTP (`POST /transcribe`, audio blob in, transcript text out). Stood up and load-tested on Day 1 — flagged in the PRD as the highest-risk infra piece (model load time, memory footprint, endpoint uptime) versus everything else, which is pure API glue.
- **AI (all pipeline agents):** Gemini Flash (`gemini-2.5-flash`), server-side only, key in `.env.local`/Vercel env. Search grounding is used per-stage in place of a standalone web-search tool. JSON schema mode (`responseSchema`) is used for structured writes into `research_state`.
  - Per the earlier draft's finding: Gemini cannot combine Search grounding and forced `responseSchema` output in the same call. Each research-agent stage therefore runs as two internal calls — a grounded free-text research call, then a schema-forced structuring call over that text — rather than one call.
- **Report export:** Client-side PDF/Word generation, branded with Fulcrum, one-click download.
- **No database, no auth.** `research_state` lives only for the duration of one session (server memory / passed through the client between steps) — no persistence between visits.

## Voice Intake Sub-feature

Turn-based, not full-duplex. No text-to-speech (question is rendered as text). No live streaming, no barge-in handling.

1. **Question** — Gemini Flash generates the next question adaptively from current `research_state`, skipping topics already answered implicitly. Rendered as text.
2. **Record** — browser records one spoken answer as an audio blob.
3. **Transcribe** — blob POSTs to the Whisper microservice's `/transcribe` endpoint, returns text.
4. **Update state** — transcript appended to `research_state`.
5. **Repeat** steps 1–4.
6. **Exit** — loop ends after 5–8 exchanges (~5–8 minutes total), not a fixed-duration call. The compiled transcript becomes the structured brief that seeds the research pipeline.

This replaces the PRD's cut "30-minute structured interview" concept (deferred to v2) with a lighter, adaptive intake.

## Agentic Pipeline

Sequential, not one large prompt. A shared `research_state` JSON object is built up stage by stage; each stage reads what's already known and writes its own section with its own focused Gemini + search-grounding calls.

**Stage flow:**

1. **Idea intake** — structured form fields (idea name, description, industry, target market) plus the compiled voice-intake transcript, written into `research_state`.
2. **Research agents** (can run in parallel against `research_state`):
   - Market size agent — TAM/SAM/SOM with sourced figures and methodology.
   - Competitor agent — direct/indirect competitors, pricing, positioning; feeds SWOT.
   - PMF signal agent — pain-point evidence from forums/reviews/complaints, not a plausible-sounding story.
   - Economics agent — pricing model, implied margin from comparable pricing/cost benchmarks, and capital target needed to reach SOM (investment/capital targets are folded into this agent, not a separate stage, per PRD 5.1).
3. **Feasibility + geo agent** — technical/regulatory/go-to-market barriers. The geo half only runs if an input classifier flags the idea as inherently local (see Open Question below); otherwise skipped entirely, not rendered as empty.
4. **Synthesis agent** — combines all `research_state` sections into the final report: executive summary, sourced sections, SWOT, pros/cons, color-coded viability verdict (green/amber/red).
5. **Export** — rendered report, then branded PDF/Word download.

**Grounding rule (product requirement, not just technical):** if a stage's searches don't return enough to support a claim, that stage writes `"insufficient data"` with a stated reason rather than estimating. A well-reasoned gap is more credible than a confident, unsourced number. Every claim in the final report must be traceable to a search result or explicitly marked insufficient.

## Explicitly Out of Scope for This Spec (per PRD 5.2 / Section 10)

- Full 30-minute structured interview with topic-coverage tracking — deferred to v2.
- Performance metrics with periodic/longitudinal targets — deferred to v2. Not included even as a static one-shot projection, since the PRD explicitly rejects presenting an untracked number as if it were a tracked target.
- Text-to-speech for the voice layer.
- The Intelligence Layer (Feature 2) — separate spec, Days 6–9.
- Accounts, persistence, payment.

## Report Schema

```ts
type MarketResearchReport = {
  executive_summary: string;
  tam_sam_som: {
    tam: string;
    sam: string;
    som: string;
    methodology: string;
  };
  competitors: {
    name: string;
    description: string;
    pricing: string;
    positioning: string;
  }[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  pmf_signal: {
    summary: string;
    evidence: { claim: string; source_url: string | null }[]; // "insufficient data" claims carry source_url: null and a stated reason in `claim`
  };
  economics: {
    pricing_model: string;
    implied_margin: string;
    capital_target_to_som: string;
  };
  feasibility: {
    technical: string;
    regulatory: string;
    go_to_market: string;
    geo: { applicable: boolean; analysis: string | null }; // only populated when the idea is classified as inherently local
  };
  verdict: {
    rating: "green" | "amber" | "red";
    reasoning: string;
  };
  pros: string[];
  cons: string[];
  sources: { title: string; url: string }[];
};
```

Each stage's structuring call is schema-forced (`responseSchema` + `responseMimeType: "application/json"`) against its own slice of this shape; the synthesis agent assembles the full object. `sources` is aggregated from each stage's grounding metadata, not invented by any structuring call.

## UI

- **Step 1 — Idea form:** idea name, description, industry (dropdown), target market.
- **Step 2 — Voice intake:** question-and-record loop (5–8 exchanges) as described above, with visible progress (e.g. "Question 3 of ~6").
- **Step 3 — Pipeline running:** loading state while the multi-stage pipeline executes (can take a few minutes per PRD's non-functional target); show stage-level progress if feasible (e.g. "Researching competitors...") since the full pipeline is slower than a single call.
- **Step 4 — Report:** rendered in styled sections matching the schema above — verdict badge (color-coded) at top, executive summary, TAM/SAM/SOM, competitors, SWOT, PMF signal (with insufficient-data claims visually distinguished, not hidden), economics, feasibility (geo section only rendered if `applicable: true`), pros/cons, sources. "Download PDF" and "New Research" buttons.

## Error Handling

- Whisper microservice unreachable/timeout — inline error with retry, does not crash the voice intake loop.
- Any pipeline stage's Gemini calls fail — inline error with retry at the pipeline level (not per-stage retries for MVP); no partial/garbled report rendering.
- Basic form validation on the Step 1 fields.

## Non-Functional Requirements (from PRD Section 7)

- Every report claim traceable to a source or explicitly marked insufficient data.
- Geo/hyperlocal analysis appears only when the input classifier determines it's relevant.
- Combined voice intake + research pipeline should complete within a session a founder will actually sit through — voice intake target under ~10 minutes, pipeline a few minutes.
- Export output is presentable without further editing.

## Open Questions (carried from PRD Section 9 — need resolution before/during build, not blocking spec approval)

- Gemini Flash search-grounding response shape (grounding citations, schema fit) needs to be confirmed against the insufficient-data/sourcing requirement before Day 2 work starts.
- Whisper accuracy on Hinglish/accented speech is untested; may require moving from base/small to a larger model if Day 1 testing shows a real problem.
- The "is this idea inherently local" classifier needs explicit criteria (not a vague heuristic) or the geo module will misfire on ambiguous ideas — needs to be defined during Day 1/3 implementation.

## Testing

- Manually run 5 real startup ideas through the full flow (voice intake + pipeline + report), including at least one deliberately weak idea, per PRD's Day 5 and Section 8 success criteria — at least one must produce a genuinely negative (red) verdict, well-reasoned.
- No automated test suite for this MVP pass.
- Note: a 5–8 exchange voice call plus a multi-stage pipeline run has real wall-clock cost per test iteration (audio round-trips to the Whisper service, sequential/parallel Gemini calls) — budget Day 5 testing time accordingly, not as quick prompt tweaks.
