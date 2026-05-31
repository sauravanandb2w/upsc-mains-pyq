#!/usr/bin/env bash
# Writes js/config.js from environment variables (CI / Netlify / local deploy).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/js/config.js"

URL="${SUPABASE_URL:-}"
KEY="${SUPABASE_ANON_KEY:-}"

if [[ -z "$URL" || -z "$KEY" ]]; then
  echo "Missing SUPABASE_URL or SUPABASE_ANON_KEY — writing empty config (local-only mode)."
  cat > "$OUT" <<'EOF'
/** Generated — Supabase keys not set at build time. */
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";
EOF
  exit 0
fi

cat > "$OUT" <<EOF
/** Generated at deploy — do not commit. */
export const SUPABASE_URL = "$URL";
export const SUPABASE_ANON_KEY = "$KEY";
EOF

echo "Wrote $OUT"
