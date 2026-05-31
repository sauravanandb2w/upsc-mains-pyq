#!/usr/bin/env bash
cd "$(dirname "$0")/.." || exit 1
PORT="${1:-8080}"
echo "UPSC Mains PYQ → http://localhost:${PORT}"
exec python3 -m http.server "$PORT"
