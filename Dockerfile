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
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use system Chromium (no download)
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Create non-root user
RUN groupadd -r tgmoji && useradd -r -g tgmoji -G audio,video tgmoji \
    && mkdir -p /app /app/uploads /app/output /app/temp \
    && chown -R tgmoji:tgmoji /app

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
