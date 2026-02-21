# 📡 Client-Side API Reference

TGmoji v2 processes everything in the browser. There is no server API. Instead, the conversion is powered by JavaScript modules loaded in the page.

---

## Converter Module

The global `Converter` object (defined in `converter.js`) exposes the following functions:

### `Converter.convert(svgText, settings, onProgress)`

Full conversion pipeline. Returns an object with `gif`, `webm`, and `sticker` results.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `svgText` | `string` | Raw SVG markup (contents of the `.svg` file) |
| `settings.generateGif` | `boolean` | Whether to generate a GIF |
| `settings.generateWebm` | `boolean` | Whether to generate a Telegram Emoji WebM |
| `settings.generateSticker` | `boolean` | Whether to generate a Telegram Sticker WebM |
| `settings.gifWidth` | `number` | GIF output width in pixels |
| `settings.gifHeight` | `number` | GIF output height in pixels |
| `settings.fps` | `number` | Frames per second (1–60) |
| `settings.duration` | `number` | Animation duration in seconds |
| `settings.telegramSize` | `number` | Emoji square size (default: 100px) |
| `settings.stickerSourceW` | `number` | Source width for sticker aspect ratio |
| `settings.stickerSourceH` | `number` | Source height for sticker aspect ratio |
| `onProgress` | `function` | Progress callback: `(type, ...args)` |

**Returns:** `Promise<object>` with shape:

```js
{
  gif: { blob: Blob, filename: string, size: string },
  webm: { blob: Blob, filename: string, size: string, meetsTelegramLimit: boolean },
  sticker: { blob: Blob, filename: string, size: string, dimensions: string, meetsTelegramLimit: boolean }
}
```

---

### `Converter.captureFrames(svgText, options, onProgress)`

Captures individual frames from an animated SVG.

| Parameter | Type | Description |
|-----------|------|-------------|
| `svgText` | `string` | Raw SVG markup |
| `options.width` | `number` | Frame width |
| `options.height` | `number` | Frame height |
| `options.fps` | `number` | Frames per second |
| `options.duration` | `number` | Duration in seconds |

**Returns:** `Promise<ImageData[]>` — array of canvas ImageData objects.

---

### `Converter.framesToGIF(frames, options, onProgress)`

Encodes frames into an animated GIF using gif.js Web Workers.

**Returns:** `Promise<Blob>` — GIF file as a Blob.

---

### `Converter.framesToWebM(frames, options, onProgress)`

Encodes frames into a VP9 WebM using the MediaRecorder API.

**Returns:** `Promise<Blob>` — WebM file as a Blob.

> **Note:** Requires Chrome, Firefox, or Edge. Safari does not support VP9 MediaRecorder.

---

### `Converter.stickerDimensions(width, height)`

Computes Telegram sticker dimensions (one side = 512px).

**Returns:** `{ w: number, h: number }`

---

## Browser Requirements

| Feature | Required For | Support |
|---------|-------------|---------|
| Canvas API | All outputs | All modern browsers |
| Web Workers | GIF encoding | All modern browsers |
| MediaRecorder (VP9) | WebM output | Chrome, Firefox, Edge |
| SVG Animation API | Frame capture | All modern browsers |

---

## Telegram Limits

| Format | Max Size | Dimensions |
|--------|----------|------------|
| Emoji | 256 KB | 100×100 px |
| Sticker | 256 KB | 512px (longest side) |
| Duration | 3 seconds | — |
| Codec | VP9 | WebM container |
