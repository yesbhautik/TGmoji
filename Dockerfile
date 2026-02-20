# ──────────────────────────────────────────────────
# TGmoji — Production Dockerfile
# Multi-arch (AMD64 + ARM64) · Chromium + FFmpeg
# UI + API served from a single container
# ──────────────────────────────────────────────────
FROM node:20-slim

# Install system dependencies: Chromium, FFmpeg, fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    fonts-noto-color-emoji \
    dumb-init \
    && rm -rf /var/lib/apt/lists/* \
    # Replace crashpad handler with a no-op stub — Chromium needs to find
    # the binary (or it FATAL-crashes), but it doesn't need to actually work.
    && find / -name 'chrome_crashpad_handler' -type f \
    -exec sh -c 'echo "#!/bin/sh\nexit 0" > "$1" && chmod +x "$1"' _ {} \; 2>/dev/null || true

# Tell Puppeteer to use system Chromium (no download)
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Create non-root user with a home directory (Chromium needs ~/.config)
RUN groupadd -r tgmoji && useradd -r -g tgmoji -G audio,video -m -d /home/tgmoji tgmoji \
    && mkdir -p /app /app/uploads /app/output /app/temp \
    && mkdir -p /home/tgmoji/.config/chromium/Crash\ Reports/pending \
    && chown -R tgmoji:tgmoji /app /home/tgmoji

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application code
COPY src/ ./src/
COPY public/ ./public/
COPY server.js .env.example ./
COPY docker-entrypoint.sh /usr/local/bin/

# Ensure entrypoint is executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Make public/ writable (entrypoint injects env vars into HTML)
RUN chown -R tgmoji:tgmoji /app

# Production defaults
ENV NODE_ENV=production
ENV PORT=3000

USER tgmoji

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# dumb-init for PID 1 signal handling → entrypoint injects env → node starts
ENTRYPOINT ["dumb-init", "--", "docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
