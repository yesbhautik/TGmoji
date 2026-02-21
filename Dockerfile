# ────────────────────────────────────────────────────
# TGmoji v2 — Lightweight Docker Image
# Serves static files via Nginx Alpine (~7 MB image)
# No Node.js, no build step, no runtime dependencies.
# ────────────────────────────────────────────────────

FROM nginx:alpine

LABEL org.opencontainers.image.title="TGmoji"
LABEL org.opencontainers.image.description="SVG to GIF & Telegram Emoji/Sticker converter — 100% client-side"
LABEL org.opencontainers.image.url="https://github.com/yesbhautik/TGmoji"
LABEL org.opencontainers.image.source="https://github.com/yesbhautik/TGmoji"
LABEL org.opencontainers.image.authors="Bhautik Bavadiya <https://yesbhautik.co.in>"
LABEL org.opencontainers.image.licenses="MIT"

# Copy static files
COPY public/ /usr/share/nginx/html/

# Custom Nginx config for SPA + security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1
