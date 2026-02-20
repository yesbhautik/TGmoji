#!/bin/sh
# ──────────────────────────────────────────────────
# TGmoji — Docker Entrypoint
# Injects env vars into static HTML at container start
# so operators never need to touch the codebase.
# ──────────────────────────────────────────────────
set -e

HTML="/app/public/index.html"

# Default SITE_URL to empty (same-origin) if not set
SITE_URL="${SITE_URL:-}"

# Strip trailing slash from SITE_URL
SITE_URL="${SITE_URL%/}"

# Replace placeholders in index.html with actual env values
if [ -f "$HTML" ]; then
  sed -i "s|__SITE_URL__|${SITE_URL}|g" "$HTML"
  echo "[Entrypoint] Injected SITE_URL=${SITE_URL:-'(same-origin)'}"
fi

# Hand off to the main process (node)
exec "$@"
