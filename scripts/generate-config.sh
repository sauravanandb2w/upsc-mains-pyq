#!/usr/bin/env bash
# Writes js/config.js from environment variables (CI / Netlify / local deploy).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/js/config.js"

URL="${SUPABASE_URL:-}"
KEY="${SUPABASE_ANON_KEY:-}"
GH_ID="${GH_OAUTH_CLIENT_ID:-}"
GH_OWNER="${GH_REPO_OWNER:-}"
GH_NAME="${GH_REPO_NAME:-}"
GH_SCOPE="${GH_OAUTH_SCOPE:-public_repo}"

cat > "$OUT" <<EOF
/** Generated at deploy — do not commit. */
export const SUPABASE_URL = "${URL}";
export const SUPABASE_ANON_KEY = "${KEY}";
export const GITHUB_OAUTH_CLIENT_ID = "${GH_ID}";
export const GITHUB_REPO_OWNER = "${GH_OWNER}";
export const GITHUB_REPO_NAME = "${GH_NAME}";
export const GITHUB_OAUTH_SCOPE = "${GH_SCOPE}";
EOF

echo "Wrote $OUT"
