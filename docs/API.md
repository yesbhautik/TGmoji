# 📡 Client-Side API Reference

TGmoji v2 processes everything in the browser. There is no server API. The conversion engine is a JavaScript module loaded in the page.

---

## Converter Module

The global `Converter` object (defined in `converter.js`) exposes the following methods.

### `Converter.convert(svgText, settings, onProgress)`

Full conversion pipeline. Captures frames and encodes to all selected output formats.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `svgText` | `string` | Raw SVG markup (the contents of the `.svg` file) |
| `settings.generateGif` | `boolean` | Whether to generate an animated GIF |
| `settings.generateWebm` | `boolean` | Whether to generate a Telegram Emoji WebM |
| `settings.generateSticker` | `boolean` | Whether to generate a Telegram Sticker WebM |
| `settings.gifWidth` | `number` | GIF output width in pixels |
| `settings.gifHeight` | `number` | GIF output height in pixels |
| `settings.fps` | `number` | Frames per second (1–60) |
| `settings.duration` | `number` | Animation duration in seconds |
| `settings.telegramSize` | `number` | Emoji square size (default: 100) |
| `settings.stickerSourceW` | `number` | Source width for sticker aspect ratio |
| `settings.stickerSourceH` | `number` | Source height for sticker aspect ratio |
| `onProgress` | `function` | Progress callback: `(type, current, total)` |

**Returns:** `Promise<object>`

```js
{
  gif: { blob: Blob, filename: string, size: string },
  webm: { blob: Blob, filename: string, size: string, meetsTelegramLimit: boolean },
  sticker: { blob: Blob, filename: string, size: string, dimensions: string, meetsTelegramLimit: boolean }
}
```

**Example:**

```js
const svgText = '<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>';

const results = await Converter.convert(svgText, {
  generateGif: true,
  generateWebm: true,
  generateSticker: false,
  gifWidth: 256,
  gifHeight: 256,
  fps: 30,
  duration: 2,
  telegramSize: 100,
}, (type, current, total) => {
  console.log(`${type}: ${current}/${total}`);
});

// Download the GIF
const a = document.createElement('a');
a.href = URL.createObjectURL(results.gif.blob);
a.download = results.gif.filename;
a.click();
```

---

### `Converter.captureFrames(svgText, options, onProgress)`

Captures animation frames from an SVG, handling both **CSS `@keyframes`** and **SMIL `<animate>`** elements.

**Technique:**

1. Loads the SVG inside a hidden `<iframe>` for full CSS/SMIL rendering
2. Pauses all animations (CSS via `document.getAnimations()`, SMIL via `pauseAnimations()`)
3. Seeks to each frame's timestamp (`animation.currentTime` for CSS, `setCurrentTime()` for SMIL)
4. Inlines computed styles (`getComputedStyle`) into a deep clone of the SVG
5. Serializes the clone and draws it to canvas via `Image`

| Parameter | Type | Description |
|-----------|------|-------------|
| `svgText` | `string` | Raw SVG markup |
| `options.width` | `number` | Frame width (px) |
| `options.height` | `number` | Frame height (px) |
| `options.fps` | `number` | Frames per second |
| `options.duration` | `number` | Duration in seconds |

**Returns:** `Promise<ImageData[]>` — array of canvas `ImageData` objects.

---

### `Converter.framesToGIF(frames, options, onProgress)`

Encodes frames into an animated GIF using gif.js Web Workers.

- Transparency: Uses magenta (`0xFF00FF`) key colour. Pixels with alpha < 128 are mapped to transparent.
- Disposal: `dispose: 2` for proper frame-by-frame compositing.

**Returns:** `Promise<Blob>` — GIF file as a `Blob`.

---

### `Converter.framesToWebM(frames, options, onProgress)`

Encodes frames into a VP9 WebM using the `MediaRecorder` API.

- Replays frames onto a `<canvas>`, captures the stream, and records it.

**Returns:** `Promise<Blob>` — WebM file as a `Blob`.

> Requires Chrome, Firefox, or Edge. Safari's MediaRecorder does not support VP9.

---

### `Converter.stickerDimensions(width, height)`

Computes Telegram sticker dimensions. One side is always 512px; the other scales to preserve aspect ratio.

**Returns:** `{ w: number, h: number }`

---

## Supported Animation Types

| Type | Examples | Mechanism |
|------|----------|-----------|
| CSS `@keyframes` | `opacity`, `filter`, `stroke-dasharray`, `transform`, `fill` | Web Animations API — `document.getAnimations()` → `pause()` → `currentTime` seek |
| SMIL `<animate>` | `r`, `cx`, `fill`, `opacity` | `SVGSVGElement.setCurrentTime()` |
| SMIL `<animateTransform>` | `rotate`, `scale`, `translate` | Same as above |
| SMIL `<set>` | Discrete value changes | Same as above |

---

## Browser Requirements

| Feature | Required For | Support |
|---------|-------------|---------|
| Canvas API | All outputs | All modern browsers |
| Web Workers | GIF encoding | All modern browsers |
| Web Animations API | CSS animation capture | Chrome 84+, Firefox 75+, Edge 84+ |
| MediaRecorder (VP9) | WebM output | Chrome, Firefox, Edge |
| SVG Animation API | SMIL frame capture | All modern browsers |

---

## Telegram Limits

| Format | Max Size | Dimensions | Duration | Codec |
|--------|----------|------------|----------|-------|
| Emoji | 256 KB | 100×100 px | ≤3 sec | VP9 WebM |
| Sticker | 256 KB | 512px longest side | ≤3 sec | VP9 WebM |
