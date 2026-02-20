<div align="center">

# 🎨 TGmoji

### SVG → GIF & Telegram Emoji/Sticker Converter

**Enterprise-ready, open-source tool for converting animated SVGs into GIF, Telegram custom emoji, and Telegram sticker formats.**

[![Version](https://img.shields.io/badge/version-2.0.0-6366f1?style=for-the-badge)](https://tgmoji.ybxlabs.com)
[![License](https://img.shields.io/badge/license-MIT-10b981?style=for-the-badge)](LICENSE)
[![Node](https://img.shields.io/badge/node-≥18-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](docker-compose.yml)

<br />

**[🌐 Live Demo](https://tgmoji.ybxlabs.com)** · **[📖 API Docs](docs/API.md)** · **[🚀 Deploy Guide](docs/DEPLOYMENT.md)** · **[🐛 Report Bug](https://github.com/yesbhautik/tgmoji/issues)**

<br />

Built with ❤️ by [Bhautik Bavadiya (Yesbhautik)](https://yesbhautik.co.in) · [YBX Labs](https://ybxlabs.com)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🖼️ **GIF Output** | Animated GIF with transparency support and configurable dimensions |
| 💬 **Telegram Emoji** | VP9 WebM at 100×100px, within Telegram's 256 KB limit |
| 🏷️ **Telegram Sticker** | VP9 WebM with 512px side, auto-scaled aspect ratio, under 256 KB |
| 🔗 **Aspect Ratio Lock** | Auto-syncs width/height to maintain original proportions |
| ⏱️ **Timeline Control** | Frame-accurate animation capture via Puppeteer's Web Animations API |
| 🏗️ **Enterprise-Ready** | Browser pooling, job queue, rate limiting, graceful shutdown |
| 🐳 **Docker** | One-command deployment, multi-arch (AMD64 + ARM64), UI + API in one container |
| 🔧 **Fully Configurable** | All URLs, limits, and behavior via environment variables — zero code changes |
| 🌐 **Vercel/Netlify** | Static frontend deployment configs included |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Install & Run

```bash
# Clone the repository
git clone https://github.com/yesbhautik/tgmoji.git
cd tgmoji

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **http://localhost:3000** in your browser.

### Docker (Production)

```bash
# Option A: Pull pre-built image from GitHub Container Registry
docker pull ghcr.io/yesbhautik/tgmoji:latest

docker run -d --name tgmoji \
  -p 3000:3000 \
  -e SITE_URL=https://tgmoji.yourdomain.com \
  ghcr.io/yesbhautik/tgmoji:latest

# Option B: Build from source with Docker Compose
git clone https://github.com/yesbhautik/tgmoji.git
cd tgmoji
SITE_URL=https://tgmoji.yourdomain.com docker compose up -d --build
```

> **Note:** `SITE_URL` is optional — it sets canonical/OG meta tags for SEO. Leave empty for localhost.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│              TGmoji Container :3000                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │  Helmet   │ │   CORS   │ │  Morgan  │ │Rate Limit││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│  ┌──────────────────────────────────────────────────┐│
│  │         Static Files (public/)                    ││
│  └──────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────┐│
│  │            Job Queue (Semaphore)                  ││
│  │  Max concurrent: 3 · Max pending: 20 · Timeout   ││
│  └──────────────────────┬───────────────────────────┘│
│                         │                             │
│  ┌──────────────────────▼───────────────────────────┐│
│  │         Browser Pool (generic-pool)               ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐          ││
│  │  │Chromium 1│ │Chromium 2│ │Chromium 3│          ││
│  │  └──────────┘ └──────────┘ └──────────┘          ││
│  └──────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────┐│
│  │       Auto Cleanup (30 min interval)              ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
tgmoji/
├── .github/workflows/          # CI/CD
│   └── docker-build.yml        # Multi-arch Docker build → GHCR
│
├── src/                        # Server-side modules
│   ├── index.js                # Application entry point
│   ├── config.js               # Environment configuration
│   ├── browserPool.js          # Puppeteer browser pooling
│   ├── jobQueue.js             # Concurrency control queue
│   ├── converter.js            # SVG → GIF/WebM conversion
│   ├── cleanup.js              # Automatic file cleanup
│   └── routes.js               # Express API routes
│
├── public/                     # Static frontend
│   ├── index.html              # Main page (SEO-optimized)
│   ├── app.js                  # Frontend logic
│   └── style.css               # Design system & styles
│
├── docs/                       # Documentation
│   ├── API.md                  # API reference
│   └── DEPLOYMENT.md           # Deployment guide
│
├── Dockerfile                  # Multi-arch container (AMD64 + ARM64)
├── docker-compose.yml          # One-command deployment
├── docker-entrypoint.sh        # Runtime env injection into HTML
├── .dockerignore               # Docker build exclusions
├── .env.example                # Environment variables template
├── package.json                # Dependencies & scripts
├── CONTRIBUTING.md             # Contribution guidelines
├── LICENSE                     # MIT License
└── README.md                   # This file
```

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and adjust:

| Variable | Default | Description |
|----------|---------|-------------|
| `SITE_URL` | _(empty)_ | Public URL for SEO meta tags (e.g. `https://tgmoji.yourdomain.com`) |
| `PORT` | `3000` | Server port |
| `PUBLIC_PORT` | `3000` | Host port (Docker Compose) |
| `NODE_ENV` | `development` | Environment mode |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |
| `MAX_CONCURRENT_BROWSERS` | `3` | Max Puppeteer instances |
| `MAX_QUEUE_SIZE` | `20` | Max pending conversion jobs |
| `RATE_LIMIT_MAX` | `100` | Requests per 15-min window |
| `CONVERT_RATE_LIMIT_MAX` | `10` | Conversions per 15-min window |
| `CLEANUP_INTERVAL_MIN` | `30` | File cleanup interval (minutes) |
| `OUTPUT_TTL_MIN` | `60` | Output file lifetime (minutes) |
| `MAX_FILE_SIZE_MB` | `10` | Max upload size |

See [.env.example](.env.example) for the full list.

---

## 📡 API Reference

See the full [API Documentation](docs/API.md).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/convert` | `POST` | Convert SVG to GIF/WebM |
| `/api/download/:file` | `GET` | Download output file |
| `/api/health` | `GET` | Health check + diagnostics |
| `/api/queue-status` | `GET` | Current queue stats |

---

## 🚢 Deployment

| Platform | Type | Guide |
|----------|------|-------|
| **Docker Compose** | Full stack (recommended) | [Deployment Guide](docs/DEPLOYMENT.md#docker-compose) |
| **Vercel** | Static frontend only | [Deployment Guide](docs/DEPLOYMENT.md#vercel) |
| **Netlify** | Static frontend only | [Deployment Guide](docs/DEPLOYMENT.md#netlify) |
| **VPS / Cloud** | Manual setup | [Deployment Guide](docs/DEPLOYMENT.md#manual) |

> **Note:** Vercel and Netlify deploy only the static frontend. The conversion API requires a server with Chromium — use Docker on a VPS, Cloud Run, or similar.

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Fork → Clone → Branch → Code → Test → PR
npm run dev     # Start dev server with auto-reload
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Credits

- **[Puppeteer](https://pptr.dev/)** — Headless browser automation
- **[FFmpeg](https://ffmpeg.org/)** — Video encoding
- **[gif-encoder-2](https://github.com/benjaminadk/gif-encoder-2)** — GIF encoding
- **[generic-pool](https://github.com/coopernurse/node-pool)** — Object pooling

---

<div align="center">

**Made with ❤️ by [Bhautik Bavadiya](https://yesbhautik.co.in) · [YBX Labs](https://ybxlabs.com)**

[⬆ Back to top](#-tgmoji)

</div>
