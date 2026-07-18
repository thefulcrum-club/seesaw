#!/usr/bin/env bash
# scripts/dev-up.sh
#
# Starts the full local dev stack for seesaw:
#   - Next.js app          (:3000)  — this repo (thefulcrum-club/seesaw)
#   - seesaw-backend        (:8000)  — python venv + uvicorn, sibling repo
#                                       (thefulcrum-club/seesaw-backend)
#   - kokoro-fastapi        (:8880)  — docker, only reachable by seesaw-backend
#   - ngrok tunnels for next + seesaw-backend (named tunnels, one agent)
#
# Everything runs in a detached tmux session named "fulcrum", each service in
# its own window, wrapped in `caffeinate` so the Mac won't sleep mid-session.
# After ngrok tunnels come up, .env.local is rewritten with the fresh public
# backend URL and the Next.js window is restarted so NEXT_PUBLIC_* picks it up.
#
# Usage:
#   ./scripts/dev-up.sh          # start everything
#   ./scripts/dev-up.sh --attach # start everything, then attach to tmux
#
# Stop everything:
#   ./scripts/dev-down.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION="fulcrum"
NGROK_CONFIG="$REPO_ROOT/scripts/ngrok.yml"
NGROK_LOG="/tmp/fulcrum-ngrok.log"
ENV_LOCAL="$REPO_ROOT/.env.local"

# seesaw-backend (formerly whisper-service/) now lives in its own private
# repo, checked out as a sibling directory by default. Override with
# BACKEND_DIR=/path/to/seesaw-backend if you clone it elsewhere.
BACKEND_DIR="${BACKEND_DIR:-$REPO_ROOT/../seesaw-backend}"

cd "$REPO_ROOT"

command -v tmux >/dev/null || { echo "tmux not found. Install with: brew install tmux" >&2; exit 1; }
command -v ngrok >/dev/null || { echo "ngrok not found. Install with: brew install ngrok" >&2; exit 1; }
command -v caffeinate >/dev/null || { echo "caffeinate not found (should ship with macOS)." >&2; exit 1; }
[ -d "$BACKEND_DIR" ] || {
  echo "seesaw-backend not found at $BACKEND_DIR" >&2
  echo "Clone it: git clone https://github.com/thefulcrum-club/seesaw-backend.git $BACKEND_DIR" >&2
  echo "(or set BACKEND_DIR to point at your checkout)" >&2
  exit 1
}

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "tmux session '$SESSION' already running. Attach with: tmux attach -t $SESSION"
  echo "(or run ./scripts/dev-down.sh first to restart clean)"
  exit 0
fi

# --- Docker / kokoro preflight -----------------------------------------
if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running — attempting to launch Docker Desktop..."
  open -a Docker || true
  echo -n "Waiting for Docker to come up"
  for _ in $(seq 1 60); do
    docker info >/dev/null 2>&1 && break
    echo -n "."
    sleep 2
  done
  echo ""
  if ! docker info >/dev/null 2>&1; then
    echo "Docker still isn't up. Start Docker Desktop manually, then re-run this script." >&2
    exit 1
  fi
fi

# --- ngrok tunnel config (named tunnels, single agent) ------------------
# Only next + backend get public tunnels — kokoro is internal-only, reached
# directly by seesaw-backend over localhost, matching production (where it's
# a private Render service with no public URL either).
cat > "$NGROK_CONFIG" <<'EOF'
version: "3"
tunnels:
  next:
    addr: 3000
    proto: http
  backend:
    addr: 8000
    proto: http
EOF

# --- tmux session with one window per service ---------------------------
tmux new-session -d -s "$SESSION" -n next -c "$REPO_ROOT"
tmux send-keys -t "$SESSION:next" "caffeinate -dimsu npm run dev" C-m

tmux new-window -t "$SESSION" -n backend -c "$BACKEND_DIR"
tmux send-keys -t "$SESSION:backend" \
  "caffeinate -dimsu bash -c 'source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000'" C-m

tmux new-window -t "$SESSION" -n kokoro -c "$REPO_ROOT"
tmux send-keys -t "$SESSION:kokoro" \
  "caffeinate -dimsu docker run --rm -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest" C-m

DEFAULT_NGROK_CONFIG="$HOME/Library/Application Support/ngrok/ngrok.yml"
tmux new-window -t "$SESSION" -n ngrok -c "$REPO_ROOT"
tmux send-keys -t "$SESSION:ngrok" \
  "caffeinate -dimsu ngrok start --all --config \"$DEFAULT_NGROK_CONFIG\" --config $NGROK_CONFIG" C-m

echo "Started tmux windows: next, backend, kokoro, ngrok (session: $SESSION)"
echo "Waiting for ngrok tunnels to come up..."

# --- Poll ngrok's local API for the public URLs --------------------------
PUBLIC_NEXT="" PUBLIC_BACKEND=""
for _ in $(seq 1 30); do
  sleep 2
  JSON="$(curl -s http://localhost:4040/api/tunnels || true)"
  [ -z "$JSON" ] && continue
  PUBLIC_NEXT="$(echo "$JSON" | python3 -c "import json,sys;d=json.load(sys.stdin);print(next((t['public_url'] for t in d['tunnels'] if t['name']=='next'),''))" 2>/dev/null || true)"
  PUBLIC_BACKEND="$(echo "$JSON" | python3 -c "import json,sys;d=json.load(sys.stdin);print(next((t['public_url'] for t in d['tunnels'] if t['name']=='backend'),''))" 2>/dev/null || true)"
  [ -n "$PUBLIC_NEXT" ] && [ -n "$PUBLIC_BACKEND" ] && break
done

if [ -z "$PUBLIC_BACKEND" ]; then
  echo "Warning: not all ngrok tunnels came up in time. Check: tmux attach -t $SESSION -w ngrok" >&2
else
  echo "ngrok tunnels:"
  echo "  next:    $PUBLIC_NEXT"
  echo "  backend: $PUBLIC_BACKEND"

  # Rewrite .env.local with the fresh backend URL, preserving any other lines.
  TMP_ENV="$(mktemp)"
  grep -v "^NEXT_PUBLIC_BACKEND_URL=" "$ENV_LOCAL" 2>/dev/null > "$TMP_ENV" || true
  {
    echo "NEXT_PUBLIC_BACKEND_URL=$PUBLIC_BACKEND"
    cat "$TMP_ENV"
  } > "$ENV_LOCAL"
  rm -f "$TMP_ENV"
  echo "Updated $ENV_LOCAL with fresh tunnel URL."

  # NEXT_PUBLIC_* is inlined at build/dev-server-start time, so restart the
  # next window for the new URL to take effect.
  tmux send-keys -t "$SESSION:next" C-c
  sleep 1
  tmux send-keys -t "$SESSION:next" "caffeinate -dimsu npm run dev" C-m
  echo "Restarted Next.js dev server to pick up new env var."
fi

echo ""
echo "All set. Windows: next, backend, kokoro, ngrok"
echo "  Attach:  tmux attach -t $SESSION"
echo "  Jump to a window inside tmux: Ctrl-b then window number, or Ctrl-b w to pick"
echo "  Stop everything: ./scripts/dev-down.sh"

if [ "${1:-}" = "--attach" ]; then
  tmux attach -t "$SESSION"
fi
