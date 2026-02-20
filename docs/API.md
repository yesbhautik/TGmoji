# TGmoji — API Reference

## Base URL

```
http://localhost:3000    (development)
https://tgmoji.ybxlabs.com  (production)
```

All endpoints are prefixed with `/api`.

---

## Authentication

TGmoji does not require authentication. Rate limiting is applied per IP address.

---

## Endpoints

### `POST /api/convert`

Convert an animated SVG file to GIF, Telegram emoji WebM, and/or Telegram sticker WebM.

**Rate Limit:** 10 requests per 15 minutes per IP.

#### Request

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `svg` | File | ✅ | — | The SVG file to convert (max 10 MB) |
| `gifWidth` | Number | ❌ | `386` | GIF output width (16–2048 px) |
| `gifHeight` | Number | ❌ | `310` | GIF output height (16–2048 px) |
| `fps` | Number | ❌ | `30` | Frame rate (1–60) |
| `duration` | Number | ❌ | `2` | Animation duration in seconds (0.5–10) |
| `telegramSize` | Number | ❌ | `100` | Telegram emoji size (16–512 px) |
| `generateGif` | Boolean | ❌ | `true` | Generate GIF output |
| `generateWebm` | Boolean | ❌ | `true` | Generate Telegram emoji WebM |
| `generateSticker` | Boolean | ❌ | `true` | Generate Telegram sticker WebM |
| `stickerSourceW` | Number | ❌ | `gifWidth` | Source width for sticker aspect ratio |
| `stickerSourceH` | Number | ❌ | `gifHeight` | Source height for sticker aspect ratio |

**Content-Type:** `multipart/form-data`

#### Example

```bash
curl -X POST http://localhost:3000/api/convert \
  -F "svg=@animation.svg" \
  -F "gifWidth=400" \
  -F "gifHeight=400" \
  -F "fps=24" \
  -F "duration=2" \
  -F "generateGif=true" \
  -F "generateWebm=true" \
  -F "generateSticker=true"
```

#### Response — `200 OK`

```json
{
  "success": true,
  "results": {
    "gif": {
      "filename": "animation-1708430400000.gif",
      "url": "/api/download/animation-1708430400000.gif",
      "size": "124.5 KB"
    },
    "webm": {
      "filename": "animation-emoji-1708430400000.webm",
      "url": "/api/download/animation-emoji-1708430400000.webm",
      "size": "18.2 KB",
      "meetsTelegramLimit": true
    },
    "sticker": {
      "filename": "animation-sticker-1708430400000.webm",
      "url": "/api/download/animation-sticker-1708430400000.webm",
      "size": "42.7 KB",
      "dimensions": "512×411",
      "meetsTelegramLimit": true
    }
  }
}
```

#### Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| `400` | `{ "error": "No SVG file uploaded" }` | Missing file |
| `413` | `{ "error": "File too large..." }` | File exceeds limit |
| `429` | `{ "error": "Too many conversions..." }` | Rate limit exceeded |
| `429` | `{ "error": "Server is busy..." }` | Queue full |
| `500` | `{ "error": "Conversion failed" }` | Internal error |

---

### `GET /api/download/:filename`

Download a converted output file.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `filename` | String | Output filename from the convert response |

#### Response

The file is returned as an attachment download with the appropriate MIME type.

#### Errors

| Status | Body | Condition |
|--------|------|-----------|
| `404` | `{ "error": "File not found" }` | File doesn't exist or expired |

> **Note:** Output files are automatically deleted after 60 minutes (configurable via `OUTPUT_TTL_MIN`).

---

### `GET /api/health`

Health check endpoint with system diagnostics.

#### Response — `200 OK`

```json
{
  "status": "ok",
  "version": "2.0.0",
  "uptime": 3600,
  "env": "production",
  "queue": {
    "activeJobs": 1,
    "queueLength": 3,
    "maxConcurrent": 3,
    "maxQueueSize": 20
  },
  "browserPool": {
    "size": 3,
    "available": 2,
    "borrowed": 1,
    "pending": 0
  },
  "memory": {
    "rss": "128 MB",
    "heapUsed": "45 MB"
  }
}
```

---

### `GET /api/queue-status`

Get current job queue statistics.

#### Response — `200 OK`

```json
{
  "activeJobs": 2,
  "queueLength": 5,
  "maxConcurrent": 3,
  "maxQueueSize": 20
}
```

---

## Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Global (all endpoints) | 100 requests | 15 minutes |
| Conversion (`/api/convert`) | 10 requests | 15 minutes |

Rate limit headers are included in responses:

```
RateLimit-Limit: 10
RateLimit-Remaining: 7
RateLimit-Reset: 1708431300
```

---

## Response Headers

| Header | Description |
|--------|-------------|
| `X-Request-Id` | Unique request identifier for tracing |
| `X-RateLimit-*` | Rate limiting information |
| Standard Helmet headers | Security headers (CSP, XSS, etc.) |
