# ──────────────────────────────────────────────────
# Production Dockerfile for SVG Converter
# Multi-stage: system Chromium + FFmpeg + Node.js
# ──────────────────────────────────────────────────
FROM node:20-slim AS base

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

# Tell Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Create non-root user
RUN groupadd -r converter && useradd -r -g converter -G audio,video converter \
    && mkdir -p /app /app/uploads /app/output /app/temp \
    && chown -R converter:converter /app

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application code
COPY src/ ./src/
COPY public/ ./public/
COPY server.js .env.example ./

# Set production defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV MAX_CONCURRENT_BROWSERS=3
ENV MAX_QUEUE_SIZE=20

# Create writable directories
RUN chown -R converter:converter /app

USER converter

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Use dumb-init for proper signal handling (PID 1)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
