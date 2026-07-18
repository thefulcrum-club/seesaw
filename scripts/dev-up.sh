#!/usr/bin/env bash
# scripts/dev-up.sh
#
# Starts the full local dev stack for fulcrum:
#   - Next.js app          (:3000)
#   - whisper-service       (:8000)  — python venv + uvicorn
#   - kokoro-fastapi        (:8880)  — docker
#   - ngrok tunnels for all three (named tunnels, one agent)
#
# Everything runs in a detached tmux session named "fulcrum", each service in
# its own window, wrapped in `caffeinate` so the Mac won't sleep mid-session.
# After ngrok tunnels come up, .env.local is rewritten with the fresh public
# URLs and the Next.js window is restarted so NEXT_PUBLIC_* picks them up.
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

cd "$REPO_ROOT"

command -v tmux >/dev/null || { echo "tmux not found. Install with: brew install tmux" >&2; exit 1; }
command -v ngrok >/dev/null || { echo "ngrok not found. Install with: brew install ngrok" >&2; exit 1; }
command -v caffeinate >/dev/null || { echo "caffeinate not found (should ship with macOS)." >&2; exit 1; }

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
cat > "$NGROK_CONFIG" <<'EOF'
version: "3"
tunnels:
  next:
    addr: 3000
    proto: http
  whisper:
    addr: 8000
    proto: http
  kokoro:
    addr: 8880
    proto: http
EOF

# --- tmux session with one window per service ---------------------------
tmux new-session -d -s "$SESSION" -n next -c "$REPO_ROOT"
tmux send-keys -t "$SESSION:next" "caffeinate -dimsu npm run dev" C-m

tmux new-window -t "$SESSION" -n whisper -c "$REPO_ROOT/whisper-service"
tmux send-keys -t "$SESSION:whisper" \
  "caffeinate -dimsu bash -c 'source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000'" C-m

tmux new-window -t "$SESSION" -n kokoro -c "$REPO_ROOT"
tmux send-keys -t "$SESSION:kokoro" \
  "caffeinate -dimsu docker run --rm -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest" C-m

DEFAULT_NGROK_CONFIG="$HOME/Library/Application Support/ngrok/ngrok.yml"
tmux new-window -t "$SESSION" -n ngrok -c "$REPO_ROOT"
tmux send-keys -t "$SESSION:ngrok" \
  "caffeinate -dimsu ngrok start --all --config \"$DEFAULT_NGROK_CONFIG\" --config $NGROK_CONFIG" C-m

echo "Started tmux windows: next, whisper, kokoro, ngrok (session: $SESSION)"
echo "Waiting for ngrok tunnels to come up..."

# --- Poll ngrok's local API for the public URLs --------------------------
PUBLIC_NEXT="" PUBLIC_WHISPER="" PUBLIC_KOKORO=""
for _ in $(seq 1 30); do
  sleep 2
  JSON="$(curl -s http://localhost:4040/api/tunnels || true)"
  [ -z "$JSON" ] && continue
  PUBLIC_NEXT="$(echo "$JSON" | python3 -c "import json,sys;d=json.load(sys.stdin);print(next((t['public_url'] for t in d['tunnels'] if t['name']=='next'),''))" 2>/dev/null || true)"
  PUBLIC_WHISPER="$(echo "$JSON" | python3 -c "import json,sys;d=json.load(sys.stdin);print(next((t['public_url'] for t in d['tunnels'] if t['name']=='whisper'),''))" 2>/dev/null || true)"
  PUBLIC_KOKORO="$(echo "$JSON" | python3 -c "import json,sys;d=json.load(sys.stdin);print(next((t['public_url'] for t in d['tunnels'] if t['name']=='kokoro'),''))" 2>/dev/null || true)"
  [ -n "$PUBLIC_NEXT" ] && [ -n "$PUBLIC_WHISPER" ] && [ -n "$PUBLIC_KOKORO" ] && break
done

if [ -z "$PUBLIC_WHISPER" ] || [ -z "$PUBLIC_KOKORO" ]; then
  echo "Warning: not all ngrok tunnels came up in time. Check: tmux attach -t $SESSION -w ngrok" >&2
else
  echo "ngrok tunnels:"
  echo "  next:    $PUBLIC_NEXT"
  echo "  whisper: $PUBLIC_WHISPER"
  echo "  kokoro:  $PUBLIC_KOKORO"

  # Rewrite .env.local with fresh URLs, preserving any other lines (e.g. DATABASE_URL).
  TMP_ENV="$(mktemp)"
  grep -v "^NEXT_PUBLIC_WHISPER_SERVICE_URL=\|^NEXT_PUBLIC_KOKORO_SERVICE_URL=" "$ENV_LOCAL" 2>/dev/null > "$TMP_ENV" || true
  {
    echo "NEXT_PUBLIC_WHISPER_SERVICE_URL=$PUBLIC_WHISPER"
    echo "NEXT_PUBLIC_KOKORO_SERVICE_URL=$PUBLIC_KOKORO"
    cat "$TMP_ENV"
  } > "$ENV_LOCAL"
  rm -f "$TMP_ENV"
  echo "Updated $ENV_LOCAL with fresh tunnel URLs."

  # NEXT_PUBLIC_* is inlined at build/dev-server-start time, so restart the
  # next window for the new URLs to take effect.
  tmux send-keys -t "$SESSION:next" C-c
  sleep 1
  tmux send-keys -t "$SESSION:next" "caffeinate -dimsu npm run dev" C-m
  echo "Restarted Next.js dev server to pick up new env vars."
fi

echo ""
echo "All set. Windows: next, whisper, kokoro, ngrok"
echo "  Attach:  tmux attach -t $SESSION"
echo "  Jump to a window inside tmux: Ctrl-b then window number, or Ctrl-b w to pick"
echo "  Stop everything: ./scripts/dev-down.sh"

if [ "${1:-}" = "--attach" ]; then
  tmux attach -t "$SESSION"
fi
