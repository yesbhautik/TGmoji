// ──────────────────────────────────────────────────
// TGmoji — Application Entry Point
// ──────────────────────────────────────────────────
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');

const config = require('./config');
const routes = require('./routes');
const browserPool = require('./browserPool');
const jobQueue = require('./jobQueue');
const cleanup = require('./cleanup');

const app = express();

// ── Security ──
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Allow inline styles from SVG preview
}));

app.use(cors({
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
}));

// ── Request ID ──
app.use((req, res, next) => {
    req.id = crypto.randomUUID().slice(0, 8);
    res.setHeader('X-Request-Id', req.id);
    next();
});

// ── Logging ──
if (config.env !== 'test') {
    morgan.token('req-id', (req) => req.id);
    app.use(morgan(':req-id :method :url :status :response-time[0]ms'));
}

// ── Global Rate Limiting ──
app.use(rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
}));

// ── Static Files ──
app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: config.env === 'production' ? '1d' : 0,
    etag: true,
}));

// ── API Routes ──
app.use(routes);

// ── 404 handler ──
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// ── Global Error Handler ──
app.use((err, req, res, _next) => {
    const requestId = req.id || '-';
    console.error(`[${requestId}] Unhandled error:`, err.message);

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: `File too large. Maximum size is ${config.maxFileSizeMB} MB.` });
    }

    res.status(err.status || 500).json({
        error: config.env === 'production' ? 'Internal server error' : err.message,
    });
});

// ──────────────────────────────────────────────────
// Startup
// ──────────────────────────────────────────────────
let server;

async function start() {
    // Warm up browser pool
    console.log('[Startup] Warming up browser pool...');
    browserPool.getPool();

    // Start cleanup scheduler
    cleanup.start();

    server = app.listen(config.port, () => {
        console.log(`
  ╔══════════════════════════════════════════════════╗
  ║   🎨 TGmoji v2.0                                ║
  ║   SVG → GIF & Telegram Converter                ║
  ║   Environment: ${config.env.padEnd(33)}║
  ║   Port: ${String(config.port).padEnd(40)}║
  ║   Max concurrent: ${String(config.maxConcurrentBrowsers).padEnd(29)}║
  ║   Max queue: ${String(config.maxQueueSize).padEnd(35)}║
  ║   by Yesbhautik • YBX Labs                      ║
  ╚══════════════════════════════════════════════════╝
    `);
    });

    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
}

// ──────────────────────────────────────────────────
// Graceful Shutdown
// ──────────────────────────────────────────────────
let isShuttingDown = false;

async function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[Shutdown] Received ${signal}. Graceful shutdown starting...`);

    // 1. Stop accepting new connections
    if (server) {
        server.close(() => console.log('[Shutdown] HTTP server closed.'));
    }

    // 2. Stop cleanup timer
    cleanup.stop();

    // 3. Drain job queue (reject pending jobs)
    jobQueue.shutdown();
    console.log('[Shutdown] Job queue drained.');

    // 4. Drain browser pool
    await browserPool.drain();

    console.log('[Shutdown] Shutdown complete. Exiting.');
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ── Uncaught error handlers (don't crash) ──
process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught exception:', err);
    // In production, log and try to stay alive; in dev, crash for debugging
    if (config.env !== 'production') {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason) => {
    console.error('[WARN] Unhandled rejection:', reason);
});

// Start the server
start().catch(err => {
    console.error('[Startup] Failed:', err);
    process.exit(1);
});

module.exports = app; // For testing
