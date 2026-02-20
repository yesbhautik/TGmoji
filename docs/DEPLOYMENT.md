# TGmoji — Deployment Guide

## Table of Contents

- [Docker Compose (Recommended)](#docker-compose)
- [Manual / VPS](#manual)
- [Vercel](#vercel)
- [Netlify](#netlify)
- [Environment Variables](#environment-variables)
- [Monitoring](#monitoring)
- [Scaling](#scaling)

---

## Docker Compose

The recommended production deployment. Includes the Node.js app with an nginx reverse proxy.

### Prerequisites

- Docker Engine ≥ 20
- Docker Compose v2

### Deploy

```bash
# Clone the repo
git clone https://github.com/yesbhautik/tgmoji.git
cd tgmoji

# Configure (optional)
cp .env.example .env
# Edit .env as needed

# Build and start
docker compose up -d --build

# Verify
curl http://localhost/api/health
```

### Architecture

```
Internet → nginx :80 → Node.js :3000
              │
              └─ Static files served directly
              └─ /api/* proxied to Node.js
              └─ Rate limiting at nginx level
              └─ Gzip compression
```

### Commands

```bash
# View logs
docker compose logs -f app

# Restart
docker compose restart app

# Update (pull + rebuild)
git pull
docker compose up -d --build

# Stop
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Custom Port

```bash
# Serve on port 8080 instead of 80
PUBLIC_PORT=8080 docker compose up -d
```

### SSL/TLS

For HTTPS, place a reverse proxy (Caddy, Traefik, or Cloudflare Tunnel) in front of nginx, or modify `nginx/default.conf` to include your SSL certificates.

---

## Manual

Run on a VPS or bare-metal server without Docker.

### Prerequisites

- Node.js ≥ 18
- Chromium or Google Chrome
- FFmpeg

### Install

```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y chromium ffmpeg

# Clone and install
git clone https://github.com/yesbhautik/tgmoji.git
cd tgmoji
npm ci --omit=dev

# Configure
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=production
PORT=3000
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
PUPPETEER_SKIP_DOWNLOAD=true
```

### Run

```bash
# Start
node src/index.js

# Or with a process manager (recommended)
npx pm2 start src/index.js --name tgmoji -i max
npx pm2 save
npx pm2 startup
```

### Reverse Proxy (nginx)

```nginx
server {
    listen 80;
    server_name tgmoji.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 180s;
        client_max_body_size 10M;
    }
}
```

---

## Vercel

Vercel deploys **only the static frontend**. The conversion API must be hosted separately (Docker on a VPS, Cloud Run, etc.).

### Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Configure API URL

After deploying the frontend, set the API URL so the frontend knows where to send conversion requests.

Add this to `public/index.html` before the `<script src="app.js">` tag:

```html
<script>
  window.__API_BASE_URL__ = 'https://api.tgmoji.ybxlabs.com';
</script>
```

Or set it at build time via Vercel environment variables.

### Why Not Full-Stack on Vercel?

Puppeteer requires a Chromium binary (~280 MB) which exceeds Vercel's serverless function size limits (250 MB). The conversion process also exceeds the default 10s function timeout.

---

## Netlify

Same as Vercel — **static frontend only**.

### Deploy

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### Configure API URL

Same as Vercel — add the `window.__API_BASE_URL__` script tag to `index.html`.

---

## Environment Variables

See [.env.example](../.env.example) for the complete list.

### Core

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | `development` or `production` |
| `CORS_ORIGIN` | `*` | Allowed origins |

### Performance

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_CONCURRENT_BROWSERS` | `3` | Puppeteer browser pool size |
| `MIN_BROWSERS` | `1` | Pre-warmed browsers |
| `MAX_QUEUE_SIZE` | `20` | Max pending jobs |
| `JOB_TIMEOUT_MS` | `120000` | Job timeout (ms) |

### Security

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_MAX` | `100` | Global rate limit per 15 min |
| `CONVERT_RATE_LIMIT_MAX` | `10` | Conversion rate limit per 15 min |
| `MAX_FILE_SIZE_MB` | `10` | Max upload file size |

### Maintenance

| Variable | Default | Description |
|----------|---------|-------------|
| `CLEANUP_INTERVAL_MIN` | `30` | Cleanup frequency (minutes) |
| `OUTPUT_TTL_MIN` | `60` | Output file lifetime (minutes) |

---

## Monitoring

### Health Check

```bash
curl http://localhost:3000/api/health
```

Returns:
- Server status and uptime
- Queue depth and active jobs
- Browser pool utilization
- Memory usage (RSS and heap)

### Docker Health Check

The Docker container includes a built-in health check that polls `/api/health` every 30 seconds. Use `docker ps` to see the health status.

### Recommended Monitoring

- **Uptime:** Ping `/api/health` from UptimeRobot, Better Stack, etc.
- **Metrics:** Consume the health endpoint with Prometheus/Grafana
- **Logs:** `docker compose logs -f app` or forward to a log aggregator

---

## Scaling

### Vertical (single instance)

Increase `MAX_CONCURRENT_BROWSERS` based on available RAM:

| RAM | Recommended Browsers |
|-----|---------------------|
| 1 GB | 1–2 |
| 2 GB | 2–3 |
| 4 GB | 3–5 |
| 8 GB | 5–8 |

Each Chromium instance uses ~150–300 MB RAM.

### Horizontal (multiple instances)

Use Docker Compose's `deploy.replicas` or a container orchestrator:

```bash
# Scale to 3 app containers behind nginx
docker compose up -d --scale app=3
```

> **Note:** When scaling horizontally, update `nginx/default.conf` to load balance across instances, and consider shared storage (e.g., S3) for output files.
