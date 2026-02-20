// ──────────────────────────────────────────────────
// In-memory Job Queue with Semaphore
// Controls concurrency without Redis dependency
// ──────────────────────────────────────────────────
const config = require('./config');

class JobQueue {
    constructor() {
        this.activeJobs = 0;
        this.queue = [];         // pending jobs: { resolve, reject, timeoutId }
        this.maxConcurrent = config.maxConcurrentBrowsers;
        this.maxQueueSize = config.maxQueueSize;
        this.jobTimeout = config.jobTimeout;
        this.isShuttingDown = false;
    }

    /**
     * Enqueue a job. Returns a promise that resolves when a slot is available.
     * @returns {Promise<{ release: Function, position: number }>}
     */
    enqueue() {
        if (this.isShuttingDown) {
            return Promise.reject(new Error('Server is shutting down'));
        }

        // If a slot is available, take it immediately
        if (this.activeJobs < this.maxConcurrent) {
            this.activeJobs++;
            return Promise.resolve({
                release: () => this._release(),
                position: 0,
            });
        }

        // Check if queue is full
        if (this.queue.length >= this.maxQueueSize) {
            return Promise.reject(
                Object.assign(new Error('Server is busy. Please try again later.'), { statusCode: 429 })
            );
        }

        // Queue the request
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                // Remove from queue
                const idx = this.queue.findIndex(j => j.timeoutId === timeoutId);
                if (idx !== -1) this.queue.splice(idx, 1);
                reject(new Error('Queue timeout — server too busy'));
            }, this.jobTimeout);

            const position = this.queue.length + 1;
            this.queue.push({ resolve, reject, timeoutId });

            // Return position immediately via a separate channel
            resolve.__queuePosition = position;
        });
    }

    _release() {
        this.activeJobs--;

        // Process next in queue
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            clearTimeout(next.timeoutId);
            this.activeJobs++;
            next.resolve({
                release: () => this._release(),
                position: 0,
            });
        }
    }

    /**
     * Get current queue stats
     */
    stats() {
        return {
            activeJobs: this.activeJobs,
            queueLength: this.queue.length,
            maxConcurrent: this.maxConcurrent,
            maxQueueSize: this.maxQueueSize,
        };
    }

    /**
     * Graceful shutdown: reject all pending jobs
     */
    shutdown() {
        this.isShuttingDown = true;
        while (this.queue.length > 0) {
            const job = this.queue.shift();
            clearTimeout(job.timeoutId);
            job.reject(new Error('Server is shutting down'));
        }
    }
}

// Singleton
module.exports = new JobQueue();
