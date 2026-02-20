// ──────────────────────────────────────────────────
// Puppeteer Browser Pool
// Reuses browser instances to avoid launch overhead
// ──────────────────────────────────────────────────
const genericPool = require('generic-pool');
const puppeteer = require('puppeteer');
const config = require('./config');
const os = require('os');
const path = require('path');
const fs = require('fs');

let pool = null;
let _consecutiveFailures = 0;
const MAX_BACKOFF_MS = 30000;

// Ensure crash dump directory exists (prevents crashpad errors in Docker)
const crashDumpDir = path.join(os.tmpdir(), 'chromium-crash-dumps');
try { fs.mkdirSync(crashDumpDir, { recursive: true }); } catch (_) { }

function createPool() {
    const factory = {
        async create() {
            // Exponential backoff if previous launches failed
            if (_consecutiveFailures > 0) {
                const backoff = Math.min(1000 * Math.pow(2, _consecutiveFailures - 1), MAX_BACKOFF_MS);
                console.log(`[BrowserPool] Backing off ${backoff}ms after ${_consecutiveFailures} failures`);
                await new Promise(r => setTimeout(r, backoff));
            }

            const launchArgs = {
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--no-zygote',
                    // Crash handler flags (belt-and-suspenders — handler binary removed in Dockerfile)
                    '--disable-crashpad',
                    '--disable-breakpad',
                    '--disable-crash-reporter',
                ],
            };

            if (config.chromiumPath) {
                launchArgs.executablePath = config.chromiumPath;
            }

            try {
                const browser = await puppeteer.launch(launchArgs);
                _consecutiveFailures = 0; // Reset on success
                console.log(`[BrowserPool] Created browser (PID: ${browser.process()?.pid})`);
                return browser;
            } catch (err) {
                _consecutiveFailures++;
                throw err;
            }
        },

        async destroy(browser) {
            const pid = browser.process()?.pid;
            try {
                await browser.close();
            } catch (e) {
                // Force kill if close fails
                try { browser.process()?.kill('SIGKILL'); } catch (_) { }
            }
            console.log(`[BrowserPool] Destroyed browser (PID: ${pid})`);
        },

        async validate(browser) {
            try {
                return browser.isConnected();
            } catch {
                return false;
            }
        },
    };

    pool = genericPool.createPool(factory, {
        max: config.maxConcurrentBrowsers,
        min: config.minBrowsers,
        idleTimeoutMillis: config.browserIdleTimeout,
        acquireTimeoutMillis: config.jobTimeout,
        testOnBorrow: true,
        autostart: true,
    });

    pool.on('factoryCreateError', (err) => {
        console.error('[BrowserPool] Factory create error:', err.message);
    });

    pool.on('factoryDestroyError', (err) => {
        console.error('[BrowserPool] Factory destroy error:', err.message);
    });

    return pool;
}

function getPool() {
    if (!pool) {
        pool = createPool();
    }
    return pool;
}

async function acquire() {
    return getPool().acquire();
}

async function release(browser) {
    try {
        // Close all pages to clean state for next user
        const pages = await browser.pages();
        await Promise.all(pages.map(p => p.close().catch(() => { })));
    } catch (_) { }
    return getPool().release(browser);
}

async function drain() {
    if (pool) {
        console.log('[BrowserPool] Draining pool...');
        await pool.drain();
        await pool.clear();
        pool = null;
        console.log('[BrowserPool] Pool drained.');
    }
}

function stats() {
    if (!pool) return { size: 0, available: 0, borrowed: 0, pending: 0 };
    return {
        size: pool.size,
        available: pool.available,
        borrowed: pool.borrowed,
        pending: pool.pending,
    };
}

module.exports = { acquire, release, drain, stats, getPool };
