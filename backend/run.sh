#!/usr/bin/env bash
# ES117 Backend — Start with HTTPS via Cloudflare Tunnel
# Usage: ./run.sh           (foreground)
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
export PATH="$HOME/.local/bin:$PATH"

# Start FastAPI backend
echo "🚀 Starting ES117 backend on port $PORT..."
uv run uvicorn app.main:app --host 127.0.0.1 --port "$PORT" &
BACKEND_PID=$!
sleep 2

# Start Cloudflare Tunnel for HTTPS
echo "🔒 Starting Cloudflare HTTPS tunnel..."
echo "⚠️  NOTE: The tunnel URL may change on restart. Update your Google OAuth redirect URI if needed."
cloudflared tunnel --url "http://localhost:$PORT" &
TUNNEL_PID=$!

# Cleanup on exit
trap "echo '🛑 Shutting down...'; kill $BACKEND_PID $TUNNEL_PID 2>/dev/null" EXIT

echo "✅ Backend + Tunnel running. Press Ctrl+C to stop."
wait
