import logger from '../../../shared/config/logger.js';
import predictionContainer from '../Dependencies/dependencies.js';
import postgres from '../../../shared/config/postgres.js';

/**
 * PredictionScheduler — runs a full prediction + anomaly detection cycle
 * every PREDICTION_INTERVAL_MS (default 5 minutes).
 */
export class PredictionScheduler {
    constructor({ predictionService, intervalMs = 300_000 } = {}) {
        this.svc = predictionService;
        this.intervalMs = intervalMs;
        this._timer = null;
        this._running = false;
    }

    async _getActiveClients() {
        try {
            const result = await postgres.query(
                `SELECT DISTINCT client_id FROM endpoint_metrics WHERE time_bucket >= NOW() - INTERVAL '2 hours'`
            );
            return result.rows.map(r => r.client_id);
        } catch (e) {
            logger.error('PredictionScheduler: failed to get active clients', e);
            return [];
        }
    }

    async _run() {
        if (this._running) return;
        this._running = true;
        const start = Date.now();
        try {
            const clients = await this._getActiveClients();
            for (const clientId of clients) {
                try {
                    await this.svc.runPredictionCycle(clientId);
                } catch (e) {
                    logger.error(`PredictionScheduler: cycle error for ${clientId}:`, e);
                }
            }
            logger.info(`PredictionScheduler: cycle complete in ${Date.now() - start}ms for ${clients.length} clients`);
        } catch (e) {
            logger.error('PredictionScheduler: cycle failed:', e);
        } finally {
            this._running = false;
        }
    }

    start() {
        logger.info(`PredictionScheduler: starting (interval: ${this.intervalMs}ms)`);
        setTimeout(() => this._run(), 30_000); // 30s delay on startup
        this._timer = setInterval(() => this._run(), this.intervalMs);
        return this;
    }

    stop() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
            logger.info('PredictionScheduler: stopped');
        }
    }
}

export default new PredictionScheduler({
    predictionService: predictionContainer.services.predictionService,
    intervalMs: parseInt(process.env.PREDICTION_INTERVAL_MS) || 300_000,
});
