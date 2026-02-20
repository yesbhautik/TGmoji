// ──────────────────────────────────────────────────
// Centralized Configuration
// ──────────────────────────────────────────────────
require('dotenv').config();

const config = {
    // Server
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*',

    // Puppeteer browser pool
    maxConcurrentBrowsers: parseInt(process.env.MAX_CONCURRENT_BROWSERS, 10) || 3,
    minBrowsers: parseInt(process.env.MIN_BROWSERS, 10) || 1,
    browserIdleTimeout: parseInt(process.env.BROWSER_IDLE_TIMEOUT_MS, 10) || 60000,

    // Job queue
    maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE, 10) || 20,
    jobTimeout: parseInt(process.env.JOB_TIMEOUT_MS, 10) || 120000,

    // File management
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
    cleanupIntervalMin: parseInt(process.env.CLEANUP_INTERVAL_MIN, 10) || 30,
    outputTTLMin: parseInt(process.env.OUTPUT_TTL_MIN, 10) || 60,

    // Rate limiting
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 30,
    convertRateLimitMax: parseInt(process.env.CONVERT_RATE_LIMIT_MAX, 10) || 10,

    // Puppeteer executable (for Docker / system Chromium)
    chromiumPath: process.env.PUPPETEER_EXECUTABLE_PATH || null,

    // Site URL (for SEO/meta tags — injected into HTML by docker-entrypoint.sh)
    siteUrl: (process.env.SITE_URL || '').replace(/\/+$/, ''),
};

module.exports = config;
