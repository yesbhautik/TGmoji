// ──────────────────────────────────────────────────
// Puppeteer Browser Pool
// Reuses browser instances to avoid launch overhead
// ──────────────────────────────────────────────────
const genericPool = require('generic-pool');
const puppeteer = require('puppeteer');
const config = require('./config');

let pool = null;

function createPool() {
    const factory = {
        async create() {
            const launchArgs = {
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--single-process',
                    '--no-zygote',
                ],
            };

            if (config.chromiumPath) {
                launchArgs.executablePath = config.chromiumPath;
            }

            const browser = await puppeteer.launch(launchArgs);
            console.log(`[BrowserPool] Created browser (PID: ${browser.process()?.pid})`);
            return browser;
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
