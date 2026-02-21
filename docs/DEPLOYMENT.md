# 🚀 Deployment & Self-Hosting Guide

TGmoji is a **100% client-side** static site. There is **no server, no backend, no database**. Deploy it anywhere that serves files over HTTP.

---

## ⚡ One-Click Deploy

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yesbhautik/tgmoji)

Or manually:

1. Push repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Root Directory: `public/`
4. Click **Deploy**

### Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yesbhautik/tgmoji)

Or manually:

1. New Site → Import from Git
2. Publish directory: `public/`
3. Build command: _(leave empty — no build step)_
4. Click **Deploy**

### Cloudflare Pages

1. Dashboard → Pages → Create a project → Connect to Git
2. Build command: _(leave empty)_
3. Build output directory: `public/`
4. Deploy

### GitHub Pages

1. Repository → Settings → Pages
2. Source: `main` branch, `/public` folder
3. Save → Live at `https://yourusername.github.io/tgmoji/`

### Cloudflare Pages

TGmoji ships with ready-to-use Cloudflare config files:

| File | Purpose |
|------|---------|
| `wrangler.toml` | Wrangler CLI project config |
| `public/_headers` | Security & caching headers (auto-applied by CF Pages) |
| `public/_routes.json` | Routing rules |

#### Option A — Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create**
2. Select **Pages** → **Connect to Git**
3. Choose your GitHub repo
4. Build settings:
   - **Framework preset**: None
   - **Build command**: _(leave empty — no build step)_
   - **Build output directory**: `public/`
5. Click **Save and Deploy**

Your site will be live at `https://tgmoji.pages.dev` within seconds.

#### Option B — Wrangler CLI

```bash
# Install Wrangler globally
npm install -g wrangler

# Log in to your Cloudflare account
wrangler login

# Deploy directly from the CLI
wrangler pages deploy public/ --project-name=tgmoji
```

To create a new project on first deploy:

```bash
wrangler pages project create tgmoji
wrangler pages deploy public/ --project-name=tgmoji
```

#### Option C — GitHub Actions CI/CD

Automatically deploy on every push to `main`:

```yaml
# .github/workflows/cloudflare-pages.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy public/ --project-name=tgmoji
```

**Required GitHub Secrets:**

| Secret | Where to find it |
|--------|-----------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → any domain → Overview → right sidebar → Account ID |

#### Cloudflare Custom Domain

1. In the Cloudflare Pages project → **Custom domains** → **Set up a custom domain**
2. Enter your domain (e.g., `tgmoji.example.com`)
3. Cloudflare handles DNS + SSL automatically (if the domain is on Cloudflare)
4. For external domains, add the CNAME record shown in the dashboard

#### Pages vs Workers

TGmoji uses **Cloudflare Pages** (static hosting), not Workers. No edge compute is needed because all processing runs in the user's browser. The `wrangler.toml` is configured for Pages deployment only.

---

## 🏠 Self-Hosting

### Why Self-Host?

- **Complete control** — run on your own infrastructure
- **Air-gapped environments** — works fully offline once loaded
- **Custom domain & branding** — no third-party badge
- **Compliance** — keep everything on-premises for strict data policies
- **Zero cost** — no hosting fees if you already have a server

### What You Need

- Any HTTP server (Nginx, Apache, Caddy, lighttpd, Python, Node.js)
- No runtime dependencies (no Node.js, no Docker, no FFmpeg)
- **Just the `public/` folder**

### Files Served

```
public/
├── index.html          # Main page
├── app.js              # UI logic
├── converter.js        # Conversion engine
├── gif.worker.js       # GIF encoding worker
└── style.css           # Styles
```

That's it. 5 files. ~50 KB total.

---

### Nginx

```nginx
server {
    listen 80;
    server_name tgmoji.example.com;
    root /var/www/tgmoji/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|woff2|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
```

```bash
git clone https://github.com/yesbhautik/tgmoji.git /var/www/tgmoji
sudo systemctl reload nginx
```

### Apache

```apache
<VirtualHost *:80>
    ServerName tgmoji.example.com
    DocumentRoot /var/www/tgmoji/public

    <Directory /var/www/tgmoji/public>
        AllowOverride None
        Require all granted
    </Directory>

    # Cache static assets
    <FilesMatch "\.(js|css|svg|woff2)$">
        ExpiresActive On
        ExpiresDefault "access plus 30 days"
    </FilesMatch>
</VirtualHost>
```

### Caddy

```
tgmoji.example.com {
    root * /var/www/tgmoji/public
    file_server
    encode gzip
}
```

Caddy handles SSL automatically.

### Docker

Although TGmoji doesn't need Docker, a container can be convenient:

```dockerfile
FROM nginx:alpine
COPY public/ /usr/share/nginx/html/
EXPOSE 80
```

```bash
docker build -t tgmoji .
docker run -d -p 8080:80 --name tgmoji tgmoji
```

### Docker Compose

```yaml
version: '3'
services:
  tgmoji:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

### Python (quick test)

```bash
cd tgmoji/public
python3 -m http.server 8000
# Open http://localhost:8000
```

### Node.js (npx serve)

```bash
cd tgmoji
npm run dev
# or directly:
npx -y serve public -l 3000
```

---

## 🔐 Custom Domain & SSL

### With Vercel/Netlify/Cloudflare

1. Add your domain in the platform dashboard
2. Update DNS (CNAME or A record as instructed)
3. SSL certificates are automatically provisioned

### Self-Hosted (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tgmoji.example.com
```

Certbot handles certificate renewal automatically.

---

## 🌐 Offline / Air-Gapped Use

TGmoji works **fully offline** once the page has loaded. The only external resource loaded at page-load is:

| Resource | Purpose | Can Be Removed? |
|----------|---------|----------------|
| Google Fonts (Inter) | Typography | Yes — falls back to system fonts |
| gif.js CDN | GIF encoder library | Already loaded locally via `gif.worker.js` |

To make it fully air-gapped:

1. Download the `Inter` font and serve it locally
2. Update `style.css` to reference the local font file instead of the Google Fonts URL

After that, **zero network requests** are made — ever.

---

## 🔄 Updating

```bash
cd /var/www/tgmoji
git pull origin main
# No build step needed — changes are live immediately
```

---

## ❌ What TGmoji Does NOT Need

| Dependency | Required? |
|------------|-----------|
| Node.js runtime | ❌ No |
| npm install | ❌ No (only for `npx serve` dev server) |
| Docker | ❌ No |
| Puppeteer / Chromium | ❌ No |
| FFmpeg | ❌ No |
| Database | ❌ No |
| Environment variables | ❌ No |
| API keys | ❌ No |
| Build step | ❌ No |
