// ──────────────────────────────────────────────────
// Core Conversion Logic
// Uses browser pool instead of launching new browsers
// ──────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const GIFEncoder = require('gif-encoder-2');
const { PNG } = require('pngjs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const browserPool = require('./browserPool');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const TEMP_DIR = path.join(__dirname, '..', 'temp');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

// Ensure dirs exist
[TEMP_DIR, OUTPUT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ──────────────────────────────────────────────────
// Frame capture with Puppeteer (timeline-controlled)
// ──────────────────────────────────────────────────
async function captureFrames(svgPath, options, requestId = '-') {
    const { width, height, fps, duration } = options;
    const totalFrames = Math.ceil(fps * duration);
    const frameDurationMs = 1000 / fps;
    const frames = [];

    const browser = await browserPool.acquire();
    let page = null;

    try {
        page = await browser.newPage();
        await page.setViewport({ width: width * 2, height: height * 2, deviceScaleFactor: 2 });

        const svgContent = fs.readFileSync(svgPath, 'utf8');

        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; }
          body {
            width: ${width}px;
            height: ${height}px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            overflow: hidden;
          }
          .svg-container {
            width: ${width}px;
            height: ${height}px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .svg-container svg {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
          }
        </style>
      </head>
      <body>
        <div class="svg-container">${svgContent}</div>
      </body>
      </html>
    `;

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 500));

        // Pause all animations and control timeline manually
        await page.evaluate(() => {
            const animations = document.getAnimations({ subtree: true });
            animations.forEach(a => a.pause());
        });

        console.log(`[${requestId}] Capturing ${totalFrames} frames at ${fps}fps over ${duration}s`);

        for (let i = 0; i < totalFrames; i++) {
            const timeMs = i * frameDurationMs;
            await page.evaluate((t) => {
                const animations = document.getAnimations({ subtree: true });
                animations.forEach(a => { a.currentTime = t; });
            }, timeMs);

            await new Promise(r => setTimeout(r, 20));

            const screenshot = await page.screenshot({
                type: 'png',
                omitBackground: true,
                clip: { x: 0, y: 0, width, height }
            });
            frames.push(screenshot);

            if ((i + 1) % 10 === 0) {
                console.log(`[${requestId}]   Frame ${i + 1}/${totalFrames}`);
            }
        }

        console.log(`[${requestId}] Frame capture complete: ${frames.length} frames`);
    } finally {
        if (page) await page.close().catch(() => { });
        await browserPool.release(browser);
    }

    return frames;
}

// ──────────────────────────────────────────────────
// GIF conversion
// ──────────────────────────────────────────────────
async function framesToGIF(frames, outputPath, options) {
    const { width, height, fps, transparentColor } = options;
    const delay = Math.round(1000 / fps);

    const encoder = new GIFEncoder(width, height, 'neuquant', true);
    const writeStream = fs.createWriteStream(outputPath);

    encoder.createReadStream().pipe(writeStream);
    encoder.start();
    encoder.setDelay(delay);
    encoder.setRepeat(0);
    encoder.setTransparent(transparentColor || 0x00000000);
    encoder.setQuality(10);

    for (let i = 0; i < frames.length; i++) {
        const png = PNG.sync.read(frames[i]);
        const pixels = new Uint8ClampedArray(width * height * 4);

        const srcW = png.width;
        const srcH = png.height;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcX = Math.floor(x * srcW / width);
                const srcY = Math.floor(y * srcH / height);
                const srcIdx = (srcY * srcW + srcX) * 4;
                const dstIdx = (y * width + x) * 4;

                pixels[dstIdx] = png.data[srcIdx];
                pixels[dstIdx + 1] = png.data[srcIdx + 1];
                pixels[dstIdx + 2] = png.data[srcIdx + 2];
                pixels[dstIdx + 3] = png.data[srcIdx + 3];

                if (png.data[srcIdx + 3] < 128) {
                    pixels[dstIdx] = 0;
                    pixels[dstIdx + 1] = 0;
                    pixels[dstIdx + 2] = 0;
                    pixels[dstIdx + 3] = 0;
                }
            }
        }

        encoder.addFrame(Array.from(pixels));
    }

    encoder.finish();

    return new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve(outputPath));
        writeStream.on('error', reject);
    });
}

// ──────────────────────────────────────────────────
// WebM conversion (generic — for emoji & sticker)
// ──────────────────────────────────────────────────
async function framesToWebM(frames, outputPath, options) {
    const { fps, outWidth, outHeight, maxDuration } = options;

    const sessionDir = path.join(TEMP_DIR, `webm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    fs.mkdirSync(sessionDir, { recursive: true });

    for (let i = 0; i < frames.length; i++) {
        const framePath = path.join(sessionDir, `frame-${String(i).padStart(5, '0')}.png`);
        fs.writeFileSync(framePath, frames[i]);
    }

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(path.join(sessionDir, 'frame-%05d.png'))
            .inputFPS(fps)
            .outputOptions([
                `-vf`, `scale=${outWidth}:${outHeight}:flags=lanczos,format=yuva420p`,
                `-c:v`, `libvpx-vp9`,
                `-pix_fmt`, `yuva420p`,
                `-b:v`, `200k`,
                `-minrate`, `50k`,
                `-maxrate`, `300k`,
                `-an`,
                `-auto-alt-ref`, `0`,
                `-deadline`, `good`,
                `-cpu-used`, `2`,
                `-row-mt`, `1`,
                `-t`, `${maxDuration}`
            ])
            .output(outputPath)
            .on('end', () => {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                resolve(outputPath);
            })
            .on('error', (err) => {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                reject(err);
            })
            .run();
    });
}

// ──────────────────────────────────────────────────
// Compute sticker dimensions
// ──────────────────────────────────────────────────
function stickerDimensions(svgWidth, svgHeight) {
    const aspect = svgWidth / svgHeight;
    if (aspect >= 1) {
        return { w: 512, h: Math.round(512 / aspect) };
    } else {
        return { w: Math.round(512 * aspect), h: 512 };
    }
}

module.exports = {
    captureFrames,
    framesToGIF,
    framesToWebM,
    stickerDimensions,
    OUTPUT_DIR,
    TEMP_DIR,
};
