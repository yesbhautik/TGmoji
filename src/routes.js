// ──────────────────────────────────────────────────
// Express Routes
// ──────────────────────────────────────────────────
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const jobQueue = require('./jobQueue');
const browserPool = require('./browserPool');
const { captureFrames, framesToGIF, framesToWebM, stickerDimensions, OUTPUT_DIR } = require('./converter');

const router = express.Router();

// ── Upload directory ──
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Multer config ──
const storage = multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/svg+xml' || path.extname(file.originalname).toLowerCase() === '.svg') {
            cb(null, true);
        } else {
            cb(new Error('Only SVG files are allowed'));
        }
    },
    limits: { fileSize: config.maxFileSizeMB * 1024 * 1024 }
});

// ── Stricter rate limit for conversion endpoint ──
const convertLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.convertRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many conversions. Please wait before trying again.' },
});

// ──────────────────────────────────────────────────
// POST /api/convert
// ──────────────────────────────────────────────────
router.post('/api/convert', convertLimiter, upload.single('svg'), async (req, res) => {
    const requestId = req.id || crypto.randomUUID().slice(0, 8);
    let jobSlot = null;

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No SVG file uploaded' });
        }

        // ── Acquire queue slot ──
        try {
            jobSlot = await jobQueue.enqueue();
        } catch (err) {
            // Clean up uploaded file
            try { fs.unlinkSync(req.file.path); } catch (_) { }
            const status = err.statusCode || 503;
            return res.status(status).json({
                error: err.message,
                queueStats: jobQueue.stats(),
            });
        }

        const svgPath = req.file.path;
        const baseName = path.basename(req.file.originalname, '.svg');
        const timestamp = Date.now();

        // ── Parse options ──
        const gifWidth = Math.min(Math.max(parseInt(req.body.gifWidth) || 386, 16), 2048);
        const gifHeight = Math.min(Math.max(parseInt(req.body.gifHeight) || 310, 16), 2048);
        const fps = Math.min(Math.max(parseInt(req.body.fps) || 30, 1), 60);
        const duration = Math.min(Math.max(parseFloat(req.body.duration) || 2, 0.5), 10);
        const telegramSize = Math.min(Math.max(parseInt(req.body.telegramSize) || 100, 16), 512);
        const generateGif = req.body.generateGif !== 'false';
        const generateWebm = req.body.generateWebm !== 'false';
        const generateSticker = req.body.generateSticker !== 'false';
        const stickerSourceW = parseInt(req.body.stickerSourceW) || gifWidth;
        const stickerSourceH = parseInt(req.body.stickerSourceH) || gifHeight;

        console.log(`[${requestId}] Converting: ${req.file.originalname} (GIF: ${gifWidth}×${gifHeight}, FPS: ${fps}, Dur: ${duration}s)`);

        const results = {};

        // ── GIF ──
        if (generateGif) {
            const gifFrames = await captureFrames(svgPath, { width: gifWidth, height: gifHeight, fps, duration }, requestId);
            const gifPath = path.join(OUTPUT_DIR, `${baseName}-${timestamp}.gif`);
            await framesToGIF(gifFrames, gifPath, { width: gifWidth, height: gifHeight, fps });

            results.gif = {
                filename: path.basename(gifPath),
                url: `/api/download/${path.basename(gifPath)}`,
                size: (fs.statSync(gifPath).size / 1024).toFixed(1) + ' KB'
            };
        }

        // ── Telegram Emoji WebM ──
        if (generateWebm) {
            const capSize = telegramSize * 2;
            const webmFrames = await captureFrames(svgPath, { width: capSize, height: capSize, fps, duration: Math.min(duration, 3) }, requestId);
            const webmPath = path.join(OUTPUT_DIR, `${baseName}-emoji-${timestamp}.webm`);
            await framesToWebM(webmFrames, webmPath, { fps, outWidth: telegramSize, outHeight: telegramSize, maxDuration: 3 });

            const webmSize = fs.statSync(webmPath).size;
            results.webm = {
                filename: path.basename(webmPath),
                url: `/api/download/${path.basename(webmPath)}`,
                size: (webmSize / 1024).toFixed(1) + ' KB',
                meetsTelegramLimit: webmSize <= 256 * 1024
            };
        }

        // ── Telegram Sticker WebM ──
        if (generateSticker) {
            const stk = stickerDimensions(stickerSourceW, stickerSourceH);
            const stickerFrames = await captureFrames(svgPath, { width: stk.w, height: stk.h, fps, duration: Math.min(duration, 3) }, requestId);
            const stickerPath = path.join(OUTPUT_DIR, `${baseName}-sticker-${timestamp}.webm`);
            await framesToWebM(stickerFrames, stickerPath, { fps, outWidth: stk.w, outHeight: stk.h, maxDuration: 3 });

            const stickerSize = fs.statSync(stickerPath).size;
            results.sticker = {
                filename: path.basename(stickerPath),
                url: `/api/download/${path.basename(stickerPath)}`,
                size: (stickerSize / 1024).toFixed(1) + ' KB',
                dimensions: `${stk.w}×${stk.h}`,
                meetsTelegramLimit: stickerSize <= 256 * 1024
            };
        }

        // Clean up uploaded SVG
        try { fs.unlinkSync(svgPath); } catch (_) { }

        console.log(`[${requestId}] ✓ Conversion complete`);
        res.json({ success: true, results });

    } catch (error) {
        console.error(`[${requestId}] Conversion error:`, error.message);
        // Clean up uploaded file on error
        if (req.file?.path) {
            try { fs.unlinkSync(req.file.path); } catch (_) { }
        }
        res.status(500).json({ error: error.message || 'Conversion failed' });
    } finally {
        if (jobSlot) jobSlot.release();
    }
});

// ──────────────────────────────────────────────────
// GET /api/download/:filename
// ──────────────────────────────────────────────────
router.get('/api/download/:filename', (req, res) => {
    const filename = path.basename(req.params.filename); // prevent path traversal
    const filePath = path.join(OUTPUT_DIR, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath);
});

// ──────────────────────────────────────────────────
// GET /api/health
// ──────────────────────────────────────────────────
router.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '2.0.0',
        uptime: Math.floor(process.uptime()),
        env: config.env,
        queue: jobQueue.stats(),
        browserPool: browserPool.stats(),
        memory: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        },
    });
});

// ──────────────────────────────────────────────────
// GET /api/queue-status
// ──────────────────────────────────────────────────
router.get('/api/queue-status', (req, res) => {
    res.json(jobQueue.stats());
});

module.exports = router;
