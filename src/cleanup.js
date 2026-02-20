// ──────────────────────────────────────────────────
// Automatic File Cleanup
// Periodically removes old output/upload/temp files
// ──────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const config = require('./config');

const DIRS_TO_CLEAN = [
    path.join(__dirname, '..', 'output'),
    path.join(__dirname, '..', 'uploads'),
    path.join(__dirname, '..', 'temp'),
];

let cleanupTimer = null;

function cleanDirectory(dirPath, maxAgeMs) {
    if (!fs.existsSync(dirPath)) return 0;

    let removed = 0;
    const now = Date.now();

    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            try {
                const stat = fs.statSync(fullPath);
                const age = now - stat.mtimeMs;

                if (age > maxAgeMs) {
                    if (entry.isDirectory()) {
                        fs.rmSync(fullPath, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(fullPath);
                    }
                    removed++;
                }
            } catch (e) {
                // File may have been deleted by another process
            }
        }
    } catch (e) {
        console.error(`[Cleanup] Error cleaning ${dirPath}:`, e.message);
    }

    return removed;
}

function runCleanup() {
    const maxAgeMs = config.outputTTLMin * 60 * 1000;
    let totalRemoved = 0;

    for (const dir of DIRS_TO_CLEAN) {
        totalRemoved += cleanDirectory(dir, maxAgeMs);
    }

    if (totalRemoved > 0) {
        console.log(`[Cleanup] Removed ${totalRemoved} expired file(s)`);
    }
}

function start() {
    // Run once on startup
    runCleanup();

    // Schedule periodic cleanup
    const intervalMs = config.cleanupIntervalMin * 60 * 1000;
    cleanupTimer = setInterval(runCleanup, intervalMs);
    cleanupTimer.unref(); // Don't prevent process exit

    console.log(`[Cleanup] Scheduled every ${config.cleanupIntervalMin}min (TTL: ${config.outputTTLMin}min)`);
}

function stop() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
    }
}

module.exports = { start, stop, runCleanup };
