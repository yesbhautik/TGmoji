<div align="center">

# 🎨 TGmoji

### SVG → GIF & Telegram Emoji/Sticker Converter

**100% client-side — runs entirely in your browser. Your files never leave your device.**

[![Version](https://img.shields.io/badge/version-2.0.0-6366f1?style=for-the-badge)](https://tgmoji.ybxlabs.com)
[![License](https://img.shields.io/badge/license-MIT-10b981?style=for-the-badge)](LICENSE)
[![Deploy](https://img.shields.io/badge/deploy-static-06b6d4?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

<br />

**[🌐 Live Demo](https://tgmoji.ybxlabs.com)** · **[🚀 Deploy Guide](docs/DEPLOYMENT.md)** · **[🐛 Report Bug](https://github.com/yesbhautik/tgmoji/issues)**

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
| 🔒 **100% Private** | All processing runs in your browser — files never leave your device |
| ⚡ **No Server Needed** | Pure static site — deploy on Vercel, Netlify, GitHub Pages, anywhere |
| 🎯 **Timeline Control** | Frame-accurate animation capture via SVG Animation API |
| 🧵 **Web Workers** | GIF encoding runs in background threads for smooth UX |

---

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/yesbhautik/tgmoji.git
cd tgmoji

# Start local dev server
npm run dev
```

Open **http://localhost:3000** in your browser.

> **That's it!** No dependencies to install. No Docker. No environment variables. Just a static file server.

### One-Click Deploy

| Platform | Deploy |
|----------|--------|
| **Vercel** | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yesbhautik/tgmoji) |
| **Netlify** | [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yesbhautik/tgmoji) |
| **GitHub Pages** | Push to `main` branch → Settings → Pages → Source: `public/` |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│               Your Browser                    │
│                                              │
│  ┌────────────┐   ┌──────────────────────┐   │
│  │ Upload SVG │──▶│  SVG Animation API   │   │
│  └────────────┘   │  setCurrentTime()    │   │
│                   └──────────┬───────────┘   │
│                              │               │
│                   ┌──────────▼───────────┐   │
│                   │   Canvas API         │   │
│                   │   Frame Capture      │   │
│                   └──────────┬───────────┘   │
│                              │               │
│            ┌─────────────────┼──────────┐    │
│            │                 │          │    │
│  ┌─────────▼──────┐ ┌───────▼──────┐ ┌─▼─┐ │
│  │  gif.js         │ │ MediaRecorder│ │   │ │
│  │  (Web Workers)  │ │ (VP9 WebM)  │ │512│ │
│  └────────┬───────┘ └──────┬───────┘ └─┬─┘ │
│           │                │           │    │
│  ┌────────▼───────────────▼───────────▼──┐ │
│  │         Download as Blob              │ │
│  └───────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
tgmoji/
├── public/                     # Everything lives here
│   ├── index.html              # Main page (SEO-optimized)
│   ├── app.js                  # UI logic & event handlers
│   ├── converter.js            # Client-side conversion engine
│   └── style.css               # Design system & styles
│
├── docs/                       # Documentation
│   ├── API.md                  # Client-side API reference
│   └── DEPLOYMENT.md           # Deployment guide
│
├── package.json                # Scripts (dev server only)
├── CONTRIBUTING.md             # Contribution guidelines
├── LICENSE                     # MIT License
└── README.md                   # This file
```

---

## 🔧 How It Works

1. **Upload** — Drop an animated SVG file
2. **Configure** — Set dimensions, FPS, duration, and output formats
3. **Convert** — The browser:
   - Embeds the SVG in a hidden iframe
   - Steps through the animation frame-by-frame using `SVGSVGElement.setCurrentTime()`
   - Renders each frame to a `<canvas>` via `drawImage()`
   - Encodes GIF using **gif.js** (Web Workers for performance)
   - Encodes WebM using **MediaRecorder** (VP9 codec)
4. **Download** — Files are created as in-memory Blobs — nothing is uploaded anywhere

---

## 🌐 Browser Support

| Browser | GIF | WebM (Emoji/Sticker) |
|---------|-----|---------------------|
| Chrome / Edge | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Safari | ✅ | ⚠️ Limited (no VP9 MediaRecorder) |

> Safari users can still generate GIFs. WebM generation requires Chrome, Firefox, or Edge.

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Fork → Clone → Branch → Code → Test → PR
npm run dev     # Start dev server
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Credits

- **[gif.js](https://jnordberg.github.io/gif.js/)** — GIF encoding with Web Workers
- **[MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)** — WebM VP9 encoding
- **[Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)** — Frame rendering
- **[SVG Animation API](https://developer.mozilla.org/en-US/docs/Web/SVG/SVG_animation_with_SMIL)** — Timeline control

---

<div align="center">

**Made with ❤️ by [Bhautik Bavadiya](https://yesbhautik.co.in) · [YBX Labs](https://ybxlabs.com)**

[⬆ Back to top](#-tgmoji)

</div>
