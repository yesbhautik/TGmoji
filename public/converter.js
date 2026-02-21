// ═══════════════════════════════════════════════════
// TGmoji v2 — Client-Side Conversion Engine
// SVG → GIF (gif.js) + WebM (MediaRecorder VP9)
// Runs entirely in the browser — no server needed
// ═══════════════════════════════════════════════════

const Converter = (() => {
    'use strict';

    // ──────────────────────────────────────────────────
    // Frame Capture
    // ──────────────────────────────────────────────────
    //
    // Real-world SVGs use CSS @keyframes — not just SMIL
    // <animate>. We render the SVG inside a same-origin
    // iframe, control animation time via the Web Animations
    // API (for CSS) + SVG.setCurrentTime (for SMIL), then
    // capture each frame by serializing the iframe's full
    // HTML into a foreignObject-based SVG and drawing that
    // via <img> → canvas.
    //

    const ANIM_SELECTOR =
        'animate, animateTransform, animateColor, set, animateMotion';

    async function captureFrames(svgText, options, onProgress) {
        const { width, height, fps, duration } = options;
        const totalFrames = Math.ceil(fps * duration);
        const frameDurationMs = 1000 / fps;
        const frames = [];

        // Create offscreen iframe
        const iframe = document.createElement('iframe');
        iframe.style.cssText =
            'position:fixed;left:-9999px;top:-9999px;' +
            `width:${width}px;height:${height}px;` +
            'border:none;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);

        try {
            const iframeDoc =
                iframe.contentDocument || iframe.contentWindow.document;
            const iframeWin = iframe.contentWindow;

            // Write the SVG inside a minimal HTML document
            iframeDoc.open();
            iframeDoc.write(
                `<!DOCTYPE html>
<html><head><style>
* { margin: 0; padding: 0; }
body {
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
}
svg {
    max-width: ${width}px;
    max-height: ${height}px;
}
</style></head>
<body>${svgText}</body></html>`
            );
            iframeDoc.close();

            // Wait for full render + fonts
            await _sleep(500);

            const svgEl = iframeDoc.querySelector('svg');
            if (!svgEl) {
                throw new Error(
                    'No <svg> element found in the uploaded file.'
                );
            }

            // ── Detect animation types ──
            const hasSMIL =
                svgEl.querySelectorAll(ANIM_SELECTOR).length > 0;

            // Gather all CSS animations via Web Animations API
            let cssAnimations = [];
            try {
                cssAnimations = iframeDoc.getAnimations
                    ? iframeDoc.getAnimations()
                    : [];
            } catch (_) { }

            const hasCSSAnimations = cssAnimations.length > 0;

            // Canvas for capture
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', {
                willReadFrequently: true,
            });

            // ── Pause all animations ──
            if (hasSMIL) {
                svgEl.pauseAnimations();
            }
            for (const anim of cssAnimations) {
                anim.pause();
            }

            for (let i = 0; i < totalFrames; i++) {
                const timeMs = i * frameDurationMs;
                const timeSec = timeMs / 1000;

                // Step SMIL animations
                if (hasSMIL) {
                    svgEl.setCurrentTime(timeSec);
                }

                // Step CSS animations
                for (const anim of cssAnimations) {
                    // Handle infinite animations by wrapping time
                    const effect = anim.effect;
                    if (effect) {
                        const timing = effect.getComputedTiming();
                        const activeDur =
                            timing.activeDuration === Infinity
                                ? (timing.duration || 1000)
                                : timing.activeDuration;

                        if (typeof activeDur === 'number' && activeDur > 0) {
                            anim.currentTime = timeMs % activeDur;
                        } else {
                            anim.currentTime = timeMs;
                        }
                    } else {
                        anim.currentTime = timeMs;
                    }
                }

                // Force style recalculation
                iframeWin.getComputedStyle(iframeDoc.body).opacity;
                await _sleep(20);

                // Capture the frame
                await _captureIframeToCanvas(
                    iframeDoc,
                    ctx,
                    width,
                    height
                );
                frames.push(ctx.getImageData(0, 0, width, height));

                if (onProgress) {
                    onProgress('capture', i + 1, totalFrames);
                }
            }
        } finally {
            document.body.removeChild(iframe);
        }

        return frames;
    }

    // ── Capture iframe content to canvas ──
    //
    // Uses XMLSerializer on the full SVG (with computed
    // styles inlined) → Blob → Image → Canvas.
    //
    // For CSS animations, we inline the computed style
    // of each animated element so the serialized SVG
    // reflects the current visual state.
    //
    async function _captureIframeToCanvas(iframeDoc, ctx, width, height) {
        const svgEl = iframeDoc.querySelector('svg');
        if (!svgEl) return;

        // Deep-clone the SVG
        const clone = svgEl.cloneNode(true);
        const iframeWin = iframeDoc.defaultView || iframeDoc.parentWindow;

        // Inline the computed styles of all animated elements
        // and their descendants to capture the current CSS
        // animation state
        _inlineComputedStyles(svgEl, clone, iframeWin);

        // Remove animation elements (SMIL) — values already
        // set if any SMIL exists
        clone
            .querySelectorAll(ANIM_SELECTOR)
            .forEach((el) => el.remove());

        // Also remove or neutralise <style> blocks with
        // @keyframes — we've already inlined the computed
        // styles, so CSS animations shouldn't override them
        const styleEls = clone.querySelectorAll('style');
        for (const s of styleEls) {
            s.remove();
        }

        // Ensure the clone has xmlns and explicit dimensions
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        if (!clone.getAttribute('width')) {
            clone.setAttribute('width', width);
        }
        if (!clone.getAttribute('height')) {
            clone.setAttribute('height', height);
        }

        // Serialize
        const svgData = new XMLSerializer().serializeToString(clone);
        const svgBlob = new Blob([svgData], {
            type: 'image/svg+xml;charset=utf-8',
        });
        const url = URL.createObjectURL(svgBlob);

        try {
            const img = await _loadImage(url, width, height);
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    // ── Inline computed styles from the live SVG
    //    into the cloned SVG ──
    //
    // This captures whatever the CSS animation has
    // currently set: opacity, filter, stroke-dasharray,
    // transform, fill, etc.
    //
    const STYLE_PROPERTIES = [
        'opacity',
        'filter',
        'transform',
        'fill',
        'fill-opacity',
        'stroke',
        'stroke-opacity',
        'stroke-width',
        'stroke-dasharray',
        'stroke-dashoffset',
        'stroke-linecap',
        'stroke-linejoin',
        'visibility',
        'display',
        'color',
        'font-size',
        'font-weight',
        'letter-spacing',
        'text-decoration',
        'clip-path',
        'mask',
        'r',
        'cx',
        'cy',
        'x',
        'y',
        'rx',
        'ry',
        'width',
        'height',
        'd',
    ];

    function _inlineComputedStyles(origEl, cloneEl, win) {
        // Walk both trees in parallel
        const origChildren = origEl.children;
        const cloneChildren = cloneEl.children;

        // Inline styles on the current element
        try {
            const computed = win.getComputedStyle(origEl);

            for (const prop of STYLE_PROPERTIES) {
                try {
                    const val = computed.getPropertyValue(prop);
                    if (val && val !== '' && val !== 'none' && val !== 'normal') {
                        // Skip properties that are default/empty
                        cloneEl.style.setProperty(prop, val);
                    }
                    // Special: handle 'none' for display, visibility
                    if (
                        (prop === 'display' && val === 'none') ||
                        (prop === 'visibility' && val === 'hidden')
                    ) {
                        cloneEl.style.setProperty(prop, val);
                    }
                } catch (_) { }
            }
        } catch (_) { }

        // Recurse into children
        const len = Math.min(origChildren.length, cloneChildren.length);
        for (let i = 0; i < len; i++) {
            _inlineComputedStyles(origChildren[i], cloneChildren[i], win);
        }
    }

    // ──────────────────────────────────────────────────
    // GIF Encoding (gif.js)
    // ──────────────────────────────────────────────────

    const GIF_TRANSPARENT_KEY = 0xff00ff; // magenta

    async function framesToGIF(frames, options, onProgress) {
        const { width, height, fps } = options;
        const delay = Math.round(1000 / fps);

        return new Promise((resolve, reject) => {
            if (typeof GIF === 'undefined') {
                reject(
                    new Error(
                        'GIF encoder not loaded. Please refresh the page.'
                    )
                );
                return;
            }

            const gif = new GIF({
                workers: Math.min(navigator.hardwareConcurrency || 4, 8),
                quality: 10,
                width,
                height,
                transparent: GIF_TRANSPARENT_KEY,
                workerScript: 'gif.worker.js',
            });

            frames.forEach((frame) => {
                const processed = _processFrameTransparency(
                    frame,
                    GIF_TRANSPARENT_KEY
                );
                gif.addFrame(processed, { delay, copy: true, dispose: 2 });
            });

            gif.on('progress', (p) => {
                if (onProgress) onProgress('gif', Math.round(p * 100), 100);
            });

            gif.on('finished', (blob) => resolve(blob));
            gif.on('error', (err) => reject(err));
            gif.render();
        });
    }

    function _processFrameTransparency(imageData, keyColor) {
        const data = new Uint8ClampedArray(imageData.data);
        const kr = (keyColor >> 16) & 0xff;
        const kg = (keyColor >> 8) & 0xff;
        const kb = keyColor & 0xff;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) {
                data[i] = kr;
                data[i + 1] = kg;
                data[i + 2] = kb;
                data[i + 3] = 0;
            }
        }

        return new ImageData(data, imageData.width, imageData.height);
    }

    // ──────────────────────────────────────────────────
    // WebM Encoding (MediaRecorder + Canvas replay)
    // ──────────────────────────────────────────────────

    async function framesToWebM(frames, options, onProgress) {
        const { width, height, fps } = options;

        if (typeof MediaRecorder === 'undefined') {
            throw new Error(
                'WebM recording is not supported in this browser. ' +
                'Try Chrome, Firefox, or Edge.'
            );
        }

        const mimeType = _getWebMMimeType();
        if (!mimeType) {
            throw new Error(
                'VP9/VP8 WebM recording is not supported in this browser. ' +
                'Try Chrome or Firefox.'
            );
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        ctx.putImageData(frames[0], 0, 0);

        const stream = canvas.captureStream(0);
        const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 200000,
        });

        const chunks = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        return new Promise((resolve, reject) => {
            recorder.onerror = (e) =>
                reject(e.error || new Error('Recording failed'));

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                resolve(blob);
            };

            recorder.start();

            const delay = 1000 / fps;
            let frameIdx = 0;

            function drawNextFrame() {
                if (frameIdx >= frames.length) {
                    recorder.stop();
                    return;
                }

                ctx.putImageData(frames[frameIdx], 0, 0);

                const track = stream.getVideoTracks()[0];
                if (track && track.requestFrame) {
                    track.requestFrame();
                }

                if (onProgress) {
                    onProgress('webm', frameIdx + 1, frames.length);
                }

                frameIdx++;
                setTimeout(drawNextFrame, delay);
            }

            drawNextFrame();
        });
    }

    // ──────────────────────────────────────────────────
    // Sticker Dimensions (one side = 512px)
    // ──────────────────────────────────────────────────

    function stickerDimensions(svgWidth, svgHeight) {
        const aspect = svgWidth / svgHeight;
        if (aspect >= 1) {
            return { w: 512, h: Math.round(512 / aspect) };
        } else {
            return { w: Math.round(512 * aspect), h: 512 };
        }
    }

    // ──────────────────────────────────────────────────
    // Full Conversion Pipeline
    // ──────────────────────────────────────────────────

    async function convert(svgText, settings, onProgress) {
        const {
            generateGif,
            generateWebm,
            generateSticker,
            gifWidth,
            gifHeight,
            fps,
            duration,
            telegramSize,
            stickerSourceW,
            stickerSourceH,
        } = settings;

        const results = {};

        // Step 1: Capture frames at GIF dimensions
        onProgress?.('status', 'Capturing animation frames…');
        const gifFrames =
            generateGif || generateSticker
                ? await captureFrames(
                    svgText,
                    {
                        width: gifWidth,
                        height: gifHeight,
                        fps,
                        duration,
                    },
                    onProgress
                )
                : null;

        // Step 2: GIF
        if (generateGif && gifFrames) {
            onProgress?.('status', 'Encoding GIF…');
            const gifBlob = await framesToGIF(
                gifFrames,
                { width: gifWidth, height: gifHeight, fps },
                onProgress
            );
            results.gif = {
                blob: gifBlob,
                filename: `animation-${Date.now()}.gif`,
                size: _formatSize(gifBlob.size),
            };
        }

        // Step 3: Telegram Emoji WebM (100×100)
        if (generateWebm) {
            onProgress?.('status', 'Encoding Telegram Emoji WebM…');
            const emojiSize = telegramSize || 100;
            const emojiFrames = await captureFrames(
                svgText,
                { width: emojiSize, height: emojiSize, fps, duration },
                onProgress
            );
            const webmBlob = await framesToWebM(
                emojiFrames,
                {
                    width: emojiSize,
                    height: emojiSize,
                    fps,
                    duration,
                },
                onProgress
            );
            results.webm = {
                blob: webmBlob,
                filename: `animation-emoji-${Date.now()}.webm`,
                size: _formatSize(webmBlob.size),
                meetsTelegramLimit: webmBlob.size <= 256 * 1024,
            };
        }

        // Step 4: Telegram Sticker WebM (512px side)
        if (generateSticker) {
            onProgress?.('status', 'Encoding Telegram Sticker WebM…');
            const dims = stickerDimensions(
                stickerSourceW || gifWidth,
                stickerSourceH || gifHeight
            );
            const stickerFrames = await captureFrames(
                svgText,
                { width: dims.w, height: dims.h, fps, duration },
                onProgress
            );
            const stickerBlob = await framesToWebM(
                stickerFrames,
                {
                    width: dims.w,
                    height: dims.h,
                    fps,
                    duration,
                },
                onProgress
            );
            results.sticker = {
                blob: stickerBlob,
                filename: `animation-sticker-${Date.now()}.webm`,
                size: _formatSize(stickerBlob.size),
                dimensions: `${dims.w}×${dims.h}`,
                meetsTelegramLimit: stickerBlob.size <= 256 * 1024,
            };
        }

        return results;
    }

    // ──────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────

    function _loadImage(url, width, height) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () =>
                reject(new Error('Failed to render SVG frame'));
            img.width = width;
            img.height = height;
            img.src = url;
        });
    }

    function _sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    function _formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function _getWebMMimeType() {
        const types = [
            'video/webm; codecs=vp9',
            'video/webm; codecs=vp8',
            'video/webm',
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return null;
    }

    // ── Public API ──
    return {
        captureFrames,
        framesToGIF,
        framesToWebM,
        stickerDimensions,
        convert,
    };
})();
