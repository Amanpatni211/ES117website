#!/usr/bin/env bash
# ES117 Backend — Start Script
# Usage: ./run.sh           (foreground)
#        ./run.sh &         (background)
#        nohup ./run.sh &   (persist after logout)

set -euo pipefail
cd "$(dirname "$0")"

# Load .env if present
if [ -f .env ]; then
    set -a
    source .env
    set +a
    echo "📦 Loaded .env"
fi

PORT="${ES117_PORT:-8000}"
echo "🚀 Starting ES117 backend on port $PORT..."

export PATH="$HOME/.local/bin:$PATH"
uv run uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --reload
