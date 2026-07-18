# Python backend rewrite — design

## Goal

Move all secret-holding, logic-heavy server code out of the Next.js app and
into `whisper-service`, turning it into the single backend for seesaw
("seesaw-backend"). Next.js becomes a thin frontend that holds no API keys
and no database credentials — every request that needs `GEMINI_API_KEY` or
`DATABASE_URL` goes to this backend over HTTPS instead.

`whisper-service`'s code now lives at the root of its own private repo,
[`thefulcrum-club/seesaw-backend`](https://github.com/thefulcrum-club/seesaw-backend),
split out of `seesaw` so the frontend repo can be public (required for
Vercel's free tier) while the backend — which will hold real secrets —
stays private. Everywhere below, `whisper-service/<path>` means
`<path>` at the root of the `seesaw-backend` repo.

This is the first of several sub-projects needed to deploy seesaw to
Supabase (Postgres) + Render (backend) + Vercel (frontend), across
`seesaw` (frontend, public) and `seesaw-backend` (backend, private). This
spec covers only the backend rewrite. Database migration details (Postgres
schema, Alembic setup specifics) and deployment wiring
(Render/Vercel/Supabase configuration) are separate concerns — this spec
fixes the target shape both depend on.

## Current state

- `whisper-service/` is a single-file FastAPI app (`main.py`) exposing
  `/health` and `/transcribe` (faster-whisper STT). Runs as a Python venv
  locally, no Docker image defined yet for it specifically.
- Kokoro (TTS) runs as an unrelated third-party Docker container
  (`ghcr.io/remsky/kokoro-fastapi-cpu`), called directly by the frontend via
  `kokoroClient.ts`. Not code we own — nothing to port, just a container to
  reach internally instead of publicly.
- All other logic lives in the Next.js app:
  - `src/app/api/research/route.ts` — runs the market research pipeline,
    persists a `Session`/`Report`.
  - `src/app/api/voice-question/route.ts` — adaptive follow-up interview
    question generation.
  - `src/app/api/ideate/route.ts` — chat against a completed report,
    persists `IdeateMessage` turns.
  - `src/app/api/sessions/route.ts` and `sessions/[id]/route.ts` — list/read
    session history.
  - `src/lib/gemini/*` — `client.ts` (two thin Gemini wrappers), six agents
    (`marketSizeAgent`, `competitorAgent`, `pmfSignalAgent`,
    `economicsAgent`, `feasibilityGeoAgent`, `synthesisAgent`),
    `marketLocale.ts`, `localClassifier.ts`, `schemas.ts`, `pipeline.ts`
    (orchestrates the agents).
  - `src/lib/db.ts` + `prisma/schema.prisma` — SQLite via Prisma, models
    `Session`, `VoiceExchange`, `Report`, `IdeateMessage`.

## Target architecture

`whisper-service` grows into a multi-router FastAPI app. Kokoro keeps
running as its own container, but only the backend can reach it — the
frontend and public internet lose direct access. All Gemini/DB logic is
ported from TypeScript to Python as a near-literal translation: same
prompts, same JSON schemas, same orchestration order, same error-handling
behavior. No new features, no behavior changes — this is a language port,
not a redesign.

### Layout

```
whisper-service/
  main.py                 # FastAPI app, mounts routers, CORS
  db.py                   # SQLAlchemy engine/session, Base
  models.py               # Session, VoiceExchange, Report, IdeateMessage
  gemini/
    client.py             # run_grounded_research, run_structuring
    schemas.py             # JSON schemas, ported 1:1 from schemas.ts
    market_size_agent.py
    competitor_agent.py
    pmf_signal_agent.py
    economics_agent.py
    feasibility_geo_agent.py
    synthesis_agent.py
    market_locale.py
    local_classifier.py
    pipeline.py            # run_pipeline(), asyncio.gather for parallel agents
  routers/
    transcribe.py          # existing /transcribe, /health — unchanged logic
    tts.py                  # new /tts, proxies to Kokoro container internally
    research.py             # POST /research — runs pipeline, persists session
    voice_question.py       # POST /voice-question — adaptive interview
    ideate.py                # POST /ideate — chat against a report
    sessions.py               # GET /sessions, GET /sessions/{id}
  alembic/                    # migrations (owned by this spec's target
                               # shape; migration execution is a separate spec)
  requirements.txt
```

### Data layer

SQLAlchemy models mirror the current Prisma schema 1:1:

- `Session` — `id`, `created_at`, `updated_at`, `idea_name`, `description`,
  `industry`, `target_market`; relationships to `voice_exchanges`, `report`
  (one-to-one), `ideate_messages`.
- `VoiceExchange` — `id`, `created_at`, `question`, `answer_transcript`,
  `session_id` (FK, cascade delete).
- `Report` — `id`, `data` (JSON-encoded report string, unchanged
  serialization), `session_id` (FK, one-to-one).
- `IdeateMessage` — `id`, `created_at`, `role`, `content`, `session_id` (FK).

Targets Postgres (via Supabase in production, per the deployment doc).
Alembic replaces `prisma migrate`. Exact migration authoring/execution is
out of scope for this spec — the model shapes above are the fixed contract
the database-migration spec builds against.

### Gemini layer

`gemini/client.py` ports the two functions in `client.ts` directly, using
the Python `google-genai` SDK:

- `run_grounded_research(prompt: str) -> GroundedResult` — calls
  `generateContent` with `tools=[{"google_search": {}}]`, extracts text and
  grounding-chunk sources, same shape as today (`{text, sources: [{title,
  url}]}`).
- `run_structuring(prompt: str, response_schema: dict) -> T` — calls
  `generateContent` with `response_mime_type="application/json"` and
  `response_schema`, parses the JSON response.

Both support the same two auth modes as `client.ts`'s `getClient()`: Vertex
AI mode when `GOOGLE_CLOUD_PROJECT` is set (using Application Default
Credentials), else plain `GEMINI_API_KEY`.

Each of the 6 agent files is a near-literal translation of its TS
counterpart — same prompt text, same schema (ported to `schemas.py` as
Python dicts), same return shape. `market_locale.py` and
`local_classifier.py` port the same way.

`pipeline.py`'s `run_pipeline(state)`:
1. `locale = await classify_market_locale(state)`
2. Four agents run concurrently via `asyncio.gather`: market size,
   competitors, PMF signal, feasibility — same as `Promise.all` in
   `pipeline.ts`.
3. Economics runs after, depending on `market_size` + `locale`.
4. Synthesis runs after, depending on all prior agent outputs.
5. Sources are deduped by URL exactly as today (market-size sources +
   PMF-evidence sources with a `source_url`).

### Routers

Each router is a thin translation of its Next.js route handler:

- `research.py` — `POST /research`: runs `run_pipeline`, persists a
  `Session` + `VoiceExchange`s + `Report` (best-effort — persistence
  failures are logged and swallowed, matching `persistSession`'s
  try/catch), returns `{...report, sessionId}`. On pipeline failure, return
  502 with a generic message.
- `voice_question.py` — `POST /voice-question`: same adaptive
  min/max-exchange logic (`MIN_EXCHANGES=5`, `MAX_EXCHANGES=8`), same prompt
  construction, same `run_structuring` call with the next-question schema.
- `ideate.py` — `POST /ideate`: builds the same system-context + history
  `contents` array, calls `generateContent` directly (not `run_structuring`
  — this one is unstructured chat text, matching `ideate/route.ts`), persists
  the turn best-effort if `sessionId` is present.
- `sessions.py` — `GET /sessions`: same summary shape (`id`, `ideaName`,
  `industry`, `targetMarket`, `createdAt`, `verdict` parsed out of the
  report JSON). `GET /sessions/{id}`: same detail shape including
  `ideateMessages`.
- `transcribe.py` — unchanged from current `main.py`: `/health`,
  `/transcribe` (faster-whisper, same content-type validation, same temp
  file handling).
- `tts.py` — new `POST /tts`: proxies to the Kokoro container's
  `/v1/audio/speech` over an internal URL (env var, not `NEXT_PUBLIC_*`
  since the frontend no longer calls Kokoro directly), same request/response
  shape as `kokoroClient.ts` expects today so the frontend swap is minimal.

All routers return the same JSON field names/casing as the current Next.js
routes (camelCase where the TS routes used it, e.g. `sessionId`,
`ideaName`) so the frontend needs no response-shape changes beyond
repointing the base URL — this is a backend relocation, not an API
redesign.

### Concurrency

FastAPI endpoints that call the pipeline are `async def`. Gemini calls run
through the Python SDK's async client (or, if the SDK's async support is
incomplete for a given call, wrapped via `asyncio.to_thread` so they don't
block the event loop). `asyncio.gather` replaces `Promise.all` for the four
independently-runnable agents.

### Error handling

Matches existing behavior exactly:
- Pipeline failure → 502, generic message, error logged server-side.
- Persistence failure (DB write after a successful pipeline run) → logged,
  swallowed, request still succeeds with `sessionId: null`.
- Missing/invalid audio content-type on `/transcribe` → 400, same message
  format as today.

### Testing

Existing TS tests (`client.test.ts`, one `*.test.ts` per agent,
`pipeline.test.ts`) define the behavioral contract. Port them to `pytest`
equivalents:
- Mock the Gemini client the same way the TS tests mock `@google/genai`
  (asserting prompt content and schema passed, not real API calls).
- One test file per agent, plus a pipeline test asserting orchestration
  order/concurrency and source deduplication.
- Router tests use FastAPI's `TestClient` against a mocked pipeline/DB.

## Out of scope (separate specs)

- **Database migration** — Supabase Postgres provisioning, Alembic
  migration authoring, SQLite→Postgres data migration if any existing dev
  data needs to move.
- **Deployment topology** — Render service config for the backend +
  Kokoro, Vercel config for the frontend, env var wiring across all three,
  Supabase connection setup. Covered by `docs/deployment.md`.
- **Frontend changes** — deleting the Next.js API routes, repointing
  `whisperClient.ts`/`kokoroClient.ts` and any direct fetches to the new
  backend base URL, removing `prisma` and `@google/genai` from
  `package.json`.

## Non-goals

- No behavior changes, no new features, no schema changes beyond the
  SQLite→Postgres column-type translation. This is a language port.
- No change to the Kokoro container itself — it is third-party, unmodified,
  just made internal-only.
