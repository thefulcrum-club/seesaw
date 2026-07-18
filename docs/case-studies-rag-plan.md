# Case studies RAG pipeline — plan

## Goal
Give the market research pipeline access to real startup case studies as
grounding evidence, building a reusable, growing library over time instead of
repeating the same web searches for similar ideas.

## Decisions made (via user Q&A)
- **Sourcing**: live grounded web search per research run (same pattern as
  `runGroundedResearch` already used by `marketSizeAgent`/`competitorAgent`),
  not a fixed hand-picked seed list.
- **Storage**: "search once, cache forever." Each run:
  1. Vector-search the existing `CaseStudy` store for matches relevant to the
     new idea.
  2. If matches are weak/absent, run a fresh grounded web search for relevant
     case studies.
  3. Store any newly found case studies (title, url, extracted text/summary,
     embedding) so future runs can retrieve them without re-searching.
  4. Feed the top-K relevant case studies into the agents that benefit most
     (likely `synthesisAgent` and `pmfSignalAgent` — real precedent strengthens
     verdict reasoning and PMF signal; possibly `economicsAgent` for pricing
     benchmarks).

## Embeddings
- Use `@google/genai`'s `ai.models.embedContent` (already the SDK in use, no
  new provider/API key needed). Model: `text-embedding-004` (or current
  equivalent — confirm latest recommended embedding model at implementation
  time).
- No vector DB service needed at this scale (dozens–low-thousands of case
  studies). Store embeddings as JSON-encoded `number[]` in SQLite and do
  cosine similarity in application code (Node). Revisit only if the table
  grows large enough that this becomes slow (likely never at MVP scale).

## Schema addition (Prisma)
```prisma
model CaseStudy {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  title       String
  url         String   @unique
  summary     String   // extracted/summarized text used for retrieval + context
  embedding   String   // JSON-encoded number[] from embedContent
  industry    String?  // optional tag, helps pre-filter before vector search
}
```
Consider also a join table if we want to track which sessions/reports cited
which case studies (`SessionCaseStudy`), for traceability — not required for
MVP.

## New module: `src/lib/gemini/caseStudyAgent.ts` (or `caseStudyRag.ts`)
Responsibilities:
1. `embedText(text: string): Promise<number[]>` — thin wrapper over
   `embedContent`.
2. `findRelevantCaseStudies(query: string, topK = 5): Promise<CaseStudy[]>` —
   embed the query (idea description + industry + target market), cosine-similarity
   against all stored `CaseStudy.embedding`, return top-K above a relevance
   threshold (tune empirically, start ~0.7).
3. `searchAndStoreCaseStudies(state: ResearchState): Promise<CaseStudy[]>` —
   if `findRelevantCaseStudies` returns too few/weak matches, run
   `runGroundedResearch` with a prompt asking for real case studies of similar
   startups (successes AND failures — both are useful signal), parse out
   discrete case studies with `runStructuring`, embed each, `prisma.caseStudy.create`
   for each new one (dedupe by `url`), and return them merged with any existing matches.

## Pipeline integration (`src/lib/gemini/pipeline.ts`)
Add a step before/alongside the existing `Promise.all` batch:
```ts
const caseStudies = await searchAndStoreCaseStudies(state);
```
Thread `caseStudies` into:
- `runSynthesisAgent` — add to the prompt context so verdict reasoning/pros/cons
  can cite precedent ("similar to X, which failed due to Y").
- `runPmfSignalAgent` — real comparable outcomes strengthen PMF signal.
- Possibly surface in the report itself as a new section (`report.case_studies`)
  so it's visible in `ReportView` too, not just silently used as LLM context —
  worth a UX decision: hidden grounding only vs. a visible "Precedent" tab.

## Open questions for next scoping pass (before implementation)
1. Should case studies be shown in the UI (new ReportView tab/section) or stay
   as invisible RAG context for the LLM only?
2. Confirm current recommended Gemini embedding model name/dimensionality at
   build time (models get deprecated/renamed).
3. Relevance threshold and top-K value — start with reasonable defaults, tune
   after seeing real retrieval quality.
4. Should `searchAndStoreCaseStudies` run in parallel with the other agents
   (like `marketSize`/`competitors`/etc. today) or block on cache lookup first
   since a cache hit is fast and a cache miss (web search) is slow — probably
   fine to include in the existing `Promise.all` since it's async either way.
5. Do we cap the total `CaseStudy` table growth or add any pruning/staleness
   policy (e.g. re-verify/re-embed case studies older than N months)?

## Not doing (out of scope for this pass)
- No dedicated vector DB (pgvector, Pinecone, etc.) — SQLite + in-app cosine
  similarity is sufficient at this scale.
- No hand-picked seed source list — sourcing is live search only, per user's
  explicit choice.
