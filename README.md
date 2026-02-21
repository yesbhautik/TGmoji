<div align="center">

# 🎨 TGmoji

### SVG → GIF & Telegram Emoji/Sticker Converter

**100% client-side — your files never leave your device.**

[![Version](https://img.shields.io/badge/version-2.0.0-6366f1?style=for-the-badge)](https://tgmoji.ybxlabs.com)
[![License](https://img.shields.io/badge/license-MIT-10b981?style=for-the-badge)](LICENSE)
[![Deploy](https://img.shields.io/badge/deploy-static-06b6d4?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

<br />

**[🌐 Live Demo](https://tgmoji.ybxlabs.com)** · **[🚀 Self-Hosting](#-self-hosting)** · **[📡 API Reference](docs/API.md)** · **[🐛 Report Bug](https://github.com/yesbhautik/tgmoji/issues)**

<br />

Built with ❤️ by [Bhautik Bavadiya (Yesbhautik)](https://yesbhautik.co.in) · [YBX Labs](https://ybxlabs.com)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🖼️ **GIF Output** | Animated GIF with full transparency support and configurable dimensions |
| 💬 **Telegram Emoji** | VP9 WebM at 100×100px, within Telegram's 256 KB limit |
| 🏷️ **Telegram Sticker** | VP9 WebM with 512px longest side, auto-scaled aspect ratio |
| 🔗 **Aspect Ratio Lock** | Auto-syncs width/height to maintain original proportions |
| 🎨 **Full Animation Support** | CSS `@keyframes` + SMIL `<animate>` — opacity, transforms, stroke-dasharray, filters, colours |
| 🔒 **Complete Privacy** | All processing runs in-browser — zero uploads, zero tracking, zero data collection |
| ⚡ **Instant Processing** | No server queues — conversion starts immediately on your CPU |
| 🌍 **Self-Hostable** | Pure static site — deploy anywhere with zero dependencies |
| 🧵 **Web Workers** | GIF encoding runs in background threads for smooth UX |

---

## 🔒 Privacy & Security

TGmoji is built with **privacy as a core principle**, not an afterthought.

| Concern | TGmoji's Answer |
|---------|----------------|
| **File uploads** | ❌ None. Your files stay on your device. |
| **Server processing** | ❌ There is no server. All conversion runs in your browser's JavaScript engine. |
| **Data collection** | ❌ Zero analytics, zero cookies, zero tracking pixels. |
| **Network requests** | Only loads the page itself. No API calls during conversion. |
| **Source code** | Fully open source (MIT). Audit it yourself. |

> **Why does this matter?** Many online converters upload your files to remote servers for processing. Your SVGs may contain proprietary designs, brand assets, or sensitive artwork. With TGmoji, your intellectual property never leaves your machine.

---

## 🚀 Quick Start

### Option 1: Use the live site

Visit **[tgmoji.ybxlabs.com](https://tgmoji.ybxlabs.com)** — no installation needed.

### Option 2: Run locally

```bash
git clone https://github.com/yesbhautik/tgmoji.git
cd tgmoji
npm run dev
```

Open **http://localhost:3000**. That's it — no `npm install`, no build step, no environment variables.

### Option 3: One-click deploy

| Platform | Deploy |
|----------|--------|
| **Vercel** | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yesbhautik/tgmoji) |
| **Netlify** | [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yesbhautik/tgmoji) |
| **Cloudflare Pages** | [Deploy to Cloudflare](https://dash.cloudflare.com/?to=/:account/pages/new/provider/github) — select repo, output dir: `public/` |
| **GitHub Pages** | Settings → Pages → Source: `main` branch, `/public` folder |

---

## 🏠 Self-Hosting

TGmoji is a **purely static site** — `index.html`, `style.css`, `app.js`, `converter.js`, and `gif.worker.js`. There are no build steps, no server-side code, no databases, and no environment variables.

### Requirements

- **Any HTTP server** that can serve static files (Nginx, Apache, Caddy, Python, Node.js, etc.)
- **No runtime dependencies** — no Node.js, no Docker, no FFmpeg, no Chromium

### Method 1: Nginx

```nginx
server {
    listen       80;
    server_name  tgmoji.example.com;
    root         /var/www/tgmoji/public;
    index        index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|woff2|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Deploy files
git clone https://github.com/yesbhautik/tgmoji.git /var/www/tgmoji
sudo systemctl reload nginx
```

### Method 2: Apache

```apache
<VirtualHost *:80>
    ServerName tgmoji.example.com
    DocumentRoot /var/www/tgmoji/public

    <Directory /var/www/tgmoji/public>
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>
```

### Method 3: Caddy

```
tgmoji.example.com {
    root * /var/www/tgmoji/public
    file_server
}
```

### Method 4: Python (quick test)

```bash
git clone https://github.com/yesbhautik/tgmoji.git
cd tgmoji/public
python3 -m http.server 8000
```

### Method 5: Docker

**Option A — Pull pre-built image from GHCR:**

```bash
docker pull ghcr.io/yesbhautik/tgmoji:latest
docker run -d -p 8080:80 --name tgmoji ghcr.io/yesbhautik/tgmoji:latest
```

Open **http://localhost:8080**.

**Option B — Docker Compose:**

```bash
git clone https://github.com/yesbhautik/tgmoji.git
cd tgmoji
docker compose up -d
```

**Option C — Build locally:**

```bash
git clone https://github.com/yesbhautik/tgmoji.git
cd tgmoji
docker build -t tgmoji .
docker run -d -p 8080:80 --name tgmoji tgmoji
```

> **Image details:** `nginx:alpine` base (~7 MB), multi-arch (`amd64` + `arm64`), includes healthcheck, security headers, and gzip compression.

### Method 6: Cloudflare Pages

TGmoji includes ready-to-use Cloudflare config files (`wrangler.toml`, `public/_headers`, `public/_routes.json`).

**Option A — Cloudflare Dashboard:**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create**
2. Connect your GitHub repo
3. Build settings:
   - Build command: _(leave empty)_
   - Build output directory: `public/`
4. Deploy

**Option B — Wrangler CLI:**

```bash
# Install wrangler
npm install -g wrangler

# Authenticate
wrangler login

# Deploy directly
wrangler pages deploy public/ --project-name=tgmoji
```

**Option C — GitHub Actions CI/CD:**

Create `.github/workflows/cloudflare-pages.yml`:

```yaml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy public/ --project-name=tgmoji
```

> **Note:** Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub secrets.

See the full [Deployment Guide](docs/DEPLOYMENT.md) for all platforms and detailed Cloudflare configuration.

### Custom Domain & SSL

All platforms above support custom domains with automatic SSL. For self-hosted Nginx/Apache, use [Let's Encrypt](https://letsencrypt.org/) with Certbot:

```bash
sudo certbot --nginx -d tgmoji.example.com
```

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Your Browser                           │
│                                                          │
│  ┌────────────┐   ┌───────────────────────────────┐      │
│  │ Upload SVG │──▶│   Iframe Renderer             │      │
│  └────────────┘   │   CSS @keyframes + SMIL       │      │
│                   │   Web Animations API seek     │      │
│                   └────────────┬──────────────────┘      │
│                                │                         │
│                   ┌────────────▼──────────────────┐      │
│                   │   Canvas Capture              │      │
│                   │   getComputedStyle → clone    │      │
│                   │   XMLSerializer → Blob → img  │      │
│                   └────────────┬──────────────────┘      │
│                                │                         │
│            ┌───────────────────┼────────────────┐        │
│            │                   │                │        │
│  ┌─────────▼──────┐   ┌────────▼──────┐  ┌──────▼───┐    │
│  │  gif.js        │   │ MediaRecorder │  │ Sticker  │    │
│  │  (Web Workers) │   │ (VP9 WebM)    │  │ 512px    │    │
│  └────────┬───────┘   └──────┬────────┘  └─────┬────┘    │
│           │                  │                 │         │
│  ┌────────▼──────────────────▼─────────────────▼──────┐  │
│  │              Download as Blob                      │  │
│  └────────────────────────────────────────────────────┘. │
└──────────────────────────────────────────────────────────┘
```

### How Animation Capture Works

1. **Iframe rendering** — The SVG is loaded inside a hidden `<iframe>` with full CSS and SMIL support
2. **Time control** — CSS animations are paused and seeked via the [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) (`document.getAnimations()` → `pause()` → set `currentTime`). SMIL animations use `SVGSVGElement.setCurrentTime()`
3. **Style capture** — At each frame, `getComputedStyle()` is called on every animated element and the computed values (opacity, filter, stroke-dasharray, etc.) are inlined as `style` attributes on a deep clone
4. **Serialization** — The styled clone (with `<style>` and `<animate>` elements removed) is serialized via `XMLSerializer`, converted to a Blob URL, loaded as an `<img>`, and drawn to `<canvas>`
5. **Encoding** — Frames are encoded to GIF (gif.js Web Workers) and/or WebM (MediaRecorder VP9)

---

## 📁 Project Structure

```
tgmoji/
├── public/                     # Everything served to the browser
│   ├── index.html              # Main page (SEO + structured data + FAQ schema)
│   ├── app.js                  # UI logic & event handlers
│   ├── converter.js            # Client-side conversion engine
│   ├── gif.worker.js           # gif.js Web Worker (local copy)
│   ├── style.css               # Design system & styles
│   ├── _headers                # Cloudflare Pages headers config
│   └── _routes.json            # Cloudflare Pages routing config
│
├── .github/workflows/
│   └── docker-build.yml        # CI/CD: build & push Docker image to GHCR
│
├── docs/                       # Documentation
│   ├── API.md                  # Client-side API reference
│   └── DEPLOYMENT.md           # Platform deployment guide
│
├── Dockerfile                  # Docker image (nginx:alpine)
├── docker-compose.yml          # Docker Compose config
├── nginx.conf                  # Nginx config for Docker container
├── .dockerignore               # Docker build context exclusions
├── wrangler.toml               # Cloudflare Pages/Workers config
├── vercel.json                 # Vercel config
├── netlify.toml                # Netlify config
├── package.json                # Dev server script (npx serve)
├── CONTRIBUTING.md             # Contribution guidelines
├── LICENSE                     # MIT License
└── README.md                   # This file
```

---

## 🔧 How It Works

1. **Upload** — Drop or browse for an animated SVG
2. **Configure** — Set dimensions, FPS, duration, and output formats
3. **Convert** — The browser:
   - Embeds the SVG in a sandboxed iframe
   - Pauses & seeks CSS/SMIL animations frame-by-frame
   - Inlines computed styles and captures to canvas
   - Encodes GIF (gif.js workers) and WebM (MediaRecorder VP9)
4. **Download** — Files are in-memory Blobs — nothing is uploaded

---

## 🌐 Browser Support

| Browser | GIF | WebM (Emoji/Sticker) |
|---------|-----|---------------------|
| Chrome / Edge | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Safari | ✅ | ⚠️ No VP9 MediaRecorder |

> Safari users can still generate animated GIFs. WebM requires Chrome, Firefox, or Edge.

---

## 📱 Telegram Format Specs

| Format | Size | Dimensions | Duration | Codec |
|--------|------|------------|----------|-------|
| Emoji | ≤256 KB | 100×100 px | ≤3 sec | VP9 WebM |
| Sticker | ≤256 KB | 512px longest side | ≤3 sec | VP9 WebM |

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
git clone https://github.com/yesbhautik/tgmoji.git
cd tgmoji
npm run dev     # http://localhost:3000
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Credits

- **[gif.js](https://jnordberg.github.io/gif.js/)** — GIF encoding with Web Workers
- **[Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)** — CSS animation timeline control
- **[MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)** — WebM VP9 encoding
- **[Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)** — Frame rendering and pixel manipulation

---

<div align="center">

**Made with ❤️ by [Bhautik Bavadiya (Yesbhautik)](https://yesbhautik.co.in) · [YBX Labs](https://ybxlabs.com)**

[⬆ Back to top](#-tgmoji)

</div>
