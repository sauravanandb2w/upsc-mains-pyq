#!/usr/bin/env bash
# Create a zip ready for Netlify Drop or manual upload.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/../upsc-mains-pyq-deploy.zip"
cd "$(dirname "$ROOT")"
zip -r "$OUT" "$(basename "$ROOT")" \
  -x "*.DS_Store" \
  -x "*__MACOSX*" \
  -x "*.zip" \
  -x "*/.git/*"
echo "Created: $OUT"
echo "Upload at: https://app.netlify.com/drop"
