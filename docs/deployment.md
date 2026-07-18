# Deployment

seesaw deploys as three pieces, built from **two GitHub repos**:

| Piece                      | Repo                                | Host     | What it serves                                   |
| --------------------------- | ------------------------------------ | -------- | ------------------------------------------------- |
| Frontend (Next.js)          | `thefulcrum-club/seesaw` (public)    | Vercel   | The seesaw UI — no secrets, calls the backend over HTTPS |
| Backend                     | `thefulcrum-club/seesaw-backend` (private) | Render   | FastAPI: Gemini pipeline, sessions, transcribe, TTS proxy |
| Kokoro (TTS)                 | —  (third-party image)                | Render   | Container, private — only the backend can reach it |
| Database                    | —                                     | Supabase | Postgres, holds `Session`/`VoiceExchange`/`Report`/`IdeateMessage` |

The repos are split because `seesaw` needs to be **public** for Vercel's
free-tier hosting, while the backend holds secrets (`GEMINI_API_KEY`,
`DATABASE_URL`) and stays **private** in `seesaw-backend`. `whisper-service/`
no longer exists inside `seesaw` — that code moved to `seesaw-backend`'s
repo root (see git history in `seesaw` up to the split commit if you need
the old in-repo history).

This doc assumes the [Python backend rewrite](superpowers/specs/2026-07-18-python-backend-rewrite-design.md)
is implemented against `seesaw-backend` — i.e. it exposes `/research`,
`/ideate`, `/sessions`, `/voice-question`, `/transcribe`, `/tts`, and the
Next.js app holds no `GEMINI_API_KEY` or database credentials.

Deploy order matters: **Supabase → Render → Vercel**, since Render needs the
database URL and Vercel needs the backend URL.

---

## 1. Supabase (Postgres)

1. Create a project at [supabase.com](https://supabase.com) under the
   `thefulcrum-club` org (or link the repo's GitHub org if using Supabase's
   GitHub integration).
2. From **Project Settings → Database**, copy the **connection string**
   (use the "Transaction" pooler URI on port 6543 for the app's normal
   runtime traffic — Render's backend will make many short-lived
   connections, and Supabase's pooler is built for that; use the direct
   connection on 5432 only for running Alembic migrations).
3. Save both URLs somewhere safe — you'll need them as Render env vars:
   - `DATABASE_URL` — pooled connection, used by the running app.
   - `MIGRATIONS_DATABASE_URL` — direct connection, used only when running
     `alembic upgrade head`.
4. No manual schema setup needed — Alembic migrations (run as a Render
   deploy step, see below) create the tables.

## 2. Render (backend + Kokoro)

Render supports deploying from a `render.yaml` blueprint checked into the
repo, so both services are declared as code instead of clicked through the
dashboard. This blueprint lives in `seesaw-backend`, not `seesaw` — Render
will be pointed at the private backend repo, not the public frontend one.

Add `render.yaml` at `seesaw-backend`'s repo root:

```yaml
services:
  - type: web
    name: seesaw-backend
    runtime: docker
    dockerContext: .
    dockerfilePath: ./Dockerfile
    plan: starter
    healthCheckPath: /health
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: GOOGLE_CLOUD_PROJECT
        sync: false
      - key: GOOGLE_CLOUD_LOCATION
        value: us-central1
      - key: KOKORO_SERVICE_URL
        fromService:
          type: pserv
          name: seesaw-kokoro
          property: hostport
      - key: CORS_ALLOW_ORIGIN
        sync: false # set to the Vercel frontend URL after step 3
    preDeployCommand: alembic upgrade head

  - type: pserv
    name: seesaw-kokoro
    runtime: image
    image:
      url: ghcr.io/remsky/kokoro-fastapi-cpu:latest
    plan: starter
```

Notes:

- `seesaw-backend` is a `web` service (gets a public URL). `seesaw-kokoro`
  is a `pserv` (private service) — Render gives it no public URL, only
  reachable from other services in the same project via
  `fromService`/internal hostname. This is what makes Kokoro
  backend-only, matching the design.
- `sync: false` env vars are secrets — Render prompts you to fill them in
  via the dashboard on first deploy rather than storing them in the repo.
- `preDeployCommand: alembic upgrade head` runs migrations against
  `MIGRATIONS_DATABASE_URL` before each deploy goes live (set that as a
  separate `sync: false` var referenced by your Alembic `env.py`, so the
  pooled `DATABASE_URL` isn't used for schema changes).
- `seesaw-backend/Dockerfile` needs to install the FastAPI app's Python deps
  and expose `PORT` per Render's convention (Render sets `$PORT`; make sure
  `uvicorn` binds `0.0.0.0:$PORT`).
- Render needs access to the private `seesaw-backend` repo — authorize the
  Render GitHub App for `thefulcrum-club` (or at minimum for this repo) when
  prompted during blueprint setup.

To deploy:

1. Push `render.yaml` to `seesaw-backend`.
2. In the Render dashboard: **New → Blueprint**, pick the
   `thefulcrum-club/seesaw-backend` repo, branch `master`.
3. Render detects `render.yaml` and provisions both services. Fill in the
   `sync: false` secrets (`DATABASE_URL` from Supabase, `GEMINI_API_KEY`,
   `GOOGLE_CLOUD_PROJECT` if using Vertex AI mode) when prompted.
4. Once deployed, copy `seesaw-backend`'s public URL
   (`https://seesaw-backend.onrender.com` or similar) — needed for Vercel.
5. Every push to `master` auto-redeploys both services (Render's default
   GitHub integration behavior for blueprint-managed services).

## 3. Vercel (frontend)

1. [vercel.com/new](https://vercel.com/new) → import
   `thefulcrum-club/seesaw` (public repo — Vercel's free tier requires this)
   → framework preset **Next.js** (auto-detected).
2. Root directory: repo root (the Next.js app lives at the top level; the
   backend lives entirely in the separate `seesaw-backend` repo, so there's
   nothing to exclude).
3. Set environment variables (**Project Settings → Environment Variables**):
   - `NEXT_PUBLIC_BACKEND_URL` — the Render backend URL from step 2.4.
   - Remove/omit `GEMINI_API_KEY`, `DATABASE_URL`,
     `NEXT_PUBLIC_WHISPER_SERVICE_URL`, `NEXT_PUBLIC_KOKORO_SERVICE_URL` —
     none of these belong on the frontend after the backend rewrite; the
     frontend only ever talks to `NEXT_PUBLIC_BACKEND_URL`.
4. Deploy. Vercel auto-redeploys on every push to `master`, with preview
   deployments for other branches/PRs.
5. Back in Render, set `seesaw-backend`'s `CORS_ALLOW_ORIGIN` env var to the
   Vercel production URL (and any preview-deployment domains you want to
   allow, e.g. via a wildcard on `*.vercel.app` if the backend's CORS setup
   supports it) so the frontend can call it cross-origin.

---

## Verifying the deployment

1. `curl https://seesaw-backend.onrender.com/health` → `{"status": "ok"}`.
2. Open the Vercel URL, run through the full flow once (submit an idea →
   voice or text intake → wait for the report) to confirm the frontend can
   reach the backend, the backend can reach Gemini and Supabase, and a
   `Session`/`Report` row lands in Supabase (**Table Editor** in the
   Supabase dashboard).
3. Check `/sessions` on the Vercel app lists that run, confirming Supabase
   reads work too.

## Local dev

Clone `seesaw-backend` as a sibling of `seesaw` (both under the same parent
folder) — `scripts/dev-up.sh` expects it at `../seesaw-backend` by default,
overridable via `BACKEND_DIR`:

```bash
git clone https://github.com/thefulcrum-club/seesaw-backend.git ../seesaw-backend
```

`scripts/dev-up.sh` continues to run everything locally against SQLite —
this deployment setup only applies to the hosted environments. Point
`NEXT_PUBLIC_BACKEND_URL` at `http://localhost:8000` (or the ngrok tunnel,
as today) for local development against the Python backend once it exists.
