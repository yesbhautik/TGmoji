# TGmoji — Deployment Guide

## Table of Contents

- [Quick Start (Docker)](#quick-start-docker)
- [Pre-built Image from GHCR](#pre-built-image-from-ghcr)
- [Build from Source (Docker Compose)](#build-from-source-docker-compose)
- [Multi-Arch Builds (CI/CD)](#multi-arch-builds-cicd)
- [Manual / VPS (No Docker)](#manual--vps-no-docker)
- [Environment Variables](#environment-variables)
- [SSL/TLS](#ssltls)
- [Monitoring](#monitoring)
- [Scaling](#scaling)

---

## Quick Start (Docker)

TGmoji ships as a **single container** that serves both the UI and the API. No nginx or separate containers needed.

```bash
docker run -d --name tgmoji \
  -p 3000:3000 \
  -e SITE_URL=https://tgmoji.yourdomain.com \
  ghcr.io/yesbhautik/tgmoji:latest
```

Open **http://localhost:3000** — done. UI + API, fully functional.

> **Tip:** `SITE_URL` is optional. It sets the canonical URL, Open Graph, and JSON-LD meta tags for SEO. Leave it empty for localhost/testing.

---

## Pre-built Image from GHCR

Every push to `main` and every version tag automatically builds multi-arch Docker images (AMD64 + ARM64) and publishes them to **GitHub Container Registry**.

### Available Tags

| Tag | Description |
|-----|-------------|
| `ghcr.io/yesbhautik/tgmoji:latest` | Latest build from `main` branch |
| `ghcr.io/yesbhautik/tgmoji:main` | Same as `latest` |
| `ghcr.io/yesbhautik/tgmoji:2.0.0` | Specific version release |
| `ghcr.io/yesbhautik/tgmoji:2.0` | Major.minor version |
| `ghcr.io/yesbhautik/tgmoji:<sha>` | Specific commit SHA |

### Supported Architectures

| Architecture | Devices |
|-------------|---------|
| `linux/amd64` | Standard servers, cloud VMs, Intel/AMD desktops |
| `linux/arm64` | Raspberry Pi 4+, Apple Silicon (via Docker Desktop), AWS Graviton, Oracle Ampere |

### Pull & Run

```bash
# Pull the image (Docker auto-selects the right architecture)
docker pull ghcr.io/yesbhautik/tgmoji:latest

# Run with basic config
docker run -d --name tgmoji \
  -p 3000:3000 \
  ghcr.io/yesbhautik/tgmoji:latest

# Run with full config
docker run -d --name tgmoji \
  -p 3000:3000 \
  -e SITE_URL=https://tgmoji.yourdomain.com \
  -e CORS_ORIGIN=https://tgmoji.yourdomain.com \
  -e MAX_CONCURRENT_BROWSERS=3 \
  -e MAX_QUEUE_SIZE=20 \
  -e RATE_LIMIT_MAX=100 \
  -e CONVERT_RATE_LIMIT_MAX=10 \
  -v tgmoji_output:/app/output \
  --restart unless-stopped \
  ghcr.io/yesbhautik/tgmoji:latest
```

### Update to Latest

```bash
docker pull ghcr.io/yesbhautik/tgmoji:latest
docker stop tgmoji && docker rm tgmoji
# Re-run the docker run command above
```

---

## Build from Source (Docker Compose)

If you prefer building from source or need to customize the Dockerfile:

```bash
# Clone the repo
git clone https://github.com/yesbhautik/tgmoji.git
cd tgmoji

# Configure
cp .env.example .env
# Edit .env — set SITE_URL, adjust limits, etc.

# Build and start
docker compose up -d --build

# Verify
curl http://localhost:3000/api/health
```

### Using the Pre-built Image with Docker Compose

Edit `docker-compose.yml` — comment out the `build:` block and uncomment the `image:` line:

```yaml
services:
  tgmoji:
    # build:
    #   context: .
    #   dockerfile: Dockerfile
    image: ghcr.io/yesbhautik/tgmoji:latest
```

### Commands

```bash
# View logs
docker compose logs -f tgmoji

# Restart
docker compose restart tgmoji

# Update (pull latest + recreate)
docker compose pull
docker compose up -d

# Update (rebuild from source)
git pull
docker compose up -d --build

# Stop
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Custom Port

```bash
# Serve on port 8080 instead of 3000
PUBLIC_PORT=8080 docker compose up -d
```

---

## Multi-Arch Builds (CI/CD)

TGmoji includes a GitHub Actions workflow (`.github/workflows/docker-build.yml`) that automatically builds multi-arch images on:

| Trigger | Tags Created |
|---------|-------------|
| Push to `main` | `latest`, `main`, `<commit-sha>` |
| Version tag (`v2.1.0`) | `2.1.0`, `2.1`, `<commit-sha>` |
| Pull request | Build only (not pushed) — validates the Dockerfile |

### How It Works

```
Push to main/tag
  → GitHub Actions triggers
  → QEMU sets up ARM64 emulation
  → Docker Buildx builds linux/amd64 + linux/arm64
  → Images pushed to ghcr.io/yesbhautik/tgmoji
  → GitHub Actions cache speeds up future builds
```

### Creating a Release

```bash
# Tag a release
git tag v2.1.0
git push origin v2.1.0

# This triggers the workflow and creates:
# - ghcr.io/yesbhautik/tgmoji:2.1.0
# - ghcr.io/yesbhautik/tgmoji:2.1
# - ghcr.io/yesbhautik/tgmoji:latest
```

### Self-Hosting the Workflow

If you fork the repo, the workflow works out of the box. `GITHUB_TOKEN` is automatically available — no additional secrets needed. Images will be published to your own GHCR namespace.

---

## Manual / VPS (No Docker)

Run directly on a server without Docker.

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
SITE_URL=https://tgmoji.yourdomain.com
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
PUPPETEER_SKIP_DOWNLOAD=true
```

> **Note:** When running without Docker, the `__SITE_URL__` placeholders in `index.html` are not automatically replaced. Either run `sed -i "s|__SITE_URL__|https://tgmoji.yourdomain.com|g" public/index.html` once, or leave them empty (relative URLs work fine for single-domain setups).

### Run

```bash
# Start directly
node src/index.js

# Or with a process manager (recommended)
npx pm2 start src/index.js --name tgmoji
npx pm2 save
npx pm2 startup
```

### Reverse Proxy (nginx)

Optional — put nginx in front for SSL termination and caching:

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

## Environment Variables

**All configuration is done via environment variables.** Nobody needs to edit any source files.

See [.env.example](../.env.example) for the full list with defaults.

### Site / Branding

| Variable | Default | Description |
|----------|---------|-------------|
| `SITE_URL` | _(empty)_ | Public URL for canonical/OG/JSON-LD meta tags. Injected into HTML at container start. Leave empty for relative URLs. |
| `PUBLIC_PORT` | `3000` | Host port exposed by Docker Compose |

### Core

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port inside the container |
| `NODE_ENV` | `development` | `development` or `production` |
| `CORS_ORIGIN` | `*` | Allowed CORS origins (comma-separated or `*`) |

### Performance

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_CONCURRENT_BROWSERS` | `3` | Puppeteer browser pool size |
| `MIN_BROWSERS` | `1` | Pre-warmed browsers at startup |
| `BROWSER_IDLE_TIMEOUT_MS` | `60000` | Kill idle browsers after this time |
| `MAX_QUEUE_SIZE` | `20` | Max pending jobs before rejecting (429) |
| `JOB_TIMEOUT_MS` | `120000` | Abort a single job after this time |

### Security

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min default) |
| `RATE_LIMIT_MAX` | `100` | Global rate limit per window per IP |
| `CONVERT_RATE_LIMIT_MAX` | `10` | Conversion rate limit per window per IP |
| `MAX_FILE_SIZE_MB` | `10` | Max upload file size |

### Maintenance

| Variable | Default | Description |
|----------|---------|-------------|
| `CLEANUP_INTERVAL_MIN` | `30` | Run file cleanup this often |
| `OUTPUT_TTL_MIN` | `60` | Delete output files older than this |

### How `SITE_URL` Injection Works

The `docker-entrypoint.sh` script runs at container start and replaces `__SITE_URL__` placeholders in `public/index.html` with the value of the `SITE_URL` env var. This sets:

- `<link rel="canonical">` tag
- Open Graph (`og:url`) tag
- JSON-LD structured data (`url` field)

If `SITE_URL` is empty, these tags use relative URLs which works fine for most setups.

---

## SSL/TLS

The container serves HTTP on port 3000. For HTTPS, use one of these approaches:

### Cloudflare Tunnel (Easiest)

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Create a tunnel
cloudflared tunnel create tgmoji
cloudflared tunnel route dns tgmoji tgmoji.yourdomain.com
cloudflared tunnel run --url http://localhost:3000 tgmoji
```

### Caddy (Auto-SSL)

```
tgmoji.yourdomain.com {
    reverse_proxy localhost:3000
}
```

### Traefik / nginx + Certbot

Standard reverse proxy with Let's Encrypt certificates.

---

## Monitoring

### Health Check

```bash
curl http://localhost:3000/api/health
```

Returns:
- Server status, version, and uptime
- Queue depth and active jobs
- Browser pool utilization (size, available, borrowed, pending)
- Memory usage (RSS and heap)

### Docker Health Check

The container includes a built-in health check that polls `/api/health` every 30s:

```bash
# Check container health
docker ps
# CONTAINER ID  IMAGE              STATUS              PORTS
# abc123        tgmoji:latest      Up 5m (healthy)     0.0.0.0:3000->3000/tcp
```

### Recommended Monitoring Stack

| Tool | Purpose |
|------|---------|
| **UptimeRobot / Better Stack** | Ping `/api/health` for uptime alerts |
| **Prometheus + Grafana** | Scrape health endpoint for metrics |
| **Docker logs** | `docker logs -f tgmoji` for request logs |
| **Loki** | Aggregate logs from multiple containers |

---

## Scaling

### Vertical (Single Instance)

Increase `MAX_CONCURRENT_BROWSERS` based on available RAM:

| Server RAM | Recommended Browsers | Expected Throughput |
|-----------|---------------------|-------------------|
| 1 GB | 1–2 | ~2 concurrent conversions |
| 2 GB | 2–3 | ~3 concurrent conversions |
| 4 GB | 3–5 | ~5 concurrent conversions |
| 8 GB | 5–8 | ~8 concurrent conversions |

Each Chromium instance uses ~150–300 MB RAM.

### Horizontal (Multiple Instances)

Run multiple containers behind a load balancer:

```bash
# Using Docker Compose
docker compose up -d --scale tgmoji=3

# Or run separate containers
for i in 1 2 3; do
  docker run -d --name tgmoji-$i \
    -p $((3000+i)):3000 \
    ghcr.io/yesbhautik/tgmoji:latest
done
```

> **Note:** When scaling horizontally, put a load balancer (nginx, Caddy, Traefik, or cloud LB) in front, and consider shared storage (S3, NFS) for output files if cross-instance downloads are needed.
