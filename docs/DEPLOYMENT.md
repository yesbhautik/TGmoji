# 🚀 Deployment Guide

TGmoji is a **100% client-side** static site. Deploy it anywhere that serves HTML files.

---

## Vercel (Recommended)

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Set **Root Directory** to `public/`
5. Click **Deploy**

Or one-click: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yesbhautik/tgmoji)

---

## Netlify

1. Push your repo to GitHub
2. Go to [netlify.com](https://netlify.com)
3. New Site → Import from Git
4. Set **Publish directory** to `public/`
5. Click **Deploy**

Or one-click: [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yesbhautik/tgmoji)

---

## GitHub Pages

1. Go to your repository → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` (or `v2`), folder: `/public`
4. Save

Your site will be live at `https://yourusername.github.io/tgmoji/`.

---

## Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
2. Create a project → Connect to Git
3. Build settings:
   - **Build command**: _(leave empty)_
   - **Build output directory**: `public/`
4. Deploy

---

## Local Development

```bash
npm run dev
# Opens at http://localhost:3000
```

This uses `npx serve` — no dependencies to install.

---

## Custom Domain / SSL

Since TGmoji is a static site, SSL works out of the box with any of the above platforms. For a custom domain:

1. Add your domain in the platform's dashboard (Vercel/Netlify/Cloudflare)
2. Update DNS (CNAME or A record as instructed)
3. SSL certificates are provisioned automatically

---

## No Server Required

Unlike v1, TGmoji v2 runs **entirely in the browser**:

- ❌ No Docker
- ❌ No Node.js server
- ❌ No Puppeteer / Chromium
- ❌ No FFmpeg
- ❌ No environment variables
- ❌ No database
- ✅ Just static HTML, CSS, and JavaScript
