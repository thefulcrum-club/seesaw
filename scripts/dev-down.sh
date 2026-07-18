#!/usr/bin/env bash
# scripts/dev-down.sh
#
# Stops the tmux session started by dev-up.sh, which in turn kills every
# caffeinate-wrapped process running inside it (Next.js, whisper-service,
# kokoro's docker container, ngrok).

set -euo pipefail

SESSION="fulcrum"

if ! command -v tmux >/dev/null || ! tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "No running '$SESSION' tmux session found."
  exit 0
fi

tmux kill-session -t "$SESSION"
echo "Stopped tmux session '$SESSION' and everything running inside it."
