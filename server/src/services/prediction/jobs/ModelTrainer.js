import logger from '../../../shared/config/logger.js';
import predictionContainer from '../Dependencies/dependencies.js';
import postgres from '../../../shared/config/postgres.js';

/**
 * ModelTrainer — scheduled job that retrains all prediction models every hour.
 * Runs on setInterval; no external scheduler needed.
 */
export class ModelTrainer {
    constructor({ predictionService, intervalMs = 3_600_000 } = {}) {
        this.svc = predictionService;
        this.intervalMs = intervalMs;
        this._timer = null;
        this._running = false;
    }

    async _getActiveClients() {
        try {
            const result = await postgres.query(
                `SELECT DISTINCT client_id FROM endpoint_metrics WHERE time_bucket >= NOW() - INTERVAL '24 hours'`
            );
            return result.rows.map(r => r.client_id);
        } catch (e) {
            logger.error('ModelTrainer: failed to get active clients', e);
            return [];
        }
    }

    async _run() {
        if (this._running) {
            logger.warn('ModelTrainer: previous run still active, skipping');
            return;
        }
        this._running = true;
        logger.info('ModelTrainer: starting training cycle');
        const start = Date.now();
        try {
            const clients = await this._getActiveClients();
            logger.info(`ModelTrainer: training models for ${clients.length} clients`);
            for (const clientId of clients) {
                try {
                    await this.svc.trainModels(clientId);
                } catch (e) {
                    logger.error(`ModelTrainer: error training client ${clientId}:`, e);
                }
            }
            logger.info(`ModelTrainer: cycle complete in ${Date.now() - start}ms`);
        } catch (e) {
            logger.error('ModelTrainer: cycle failed:', e);
        } finally {
            this._running = false;
        }
    }

    start() {
        logger.info(`ModelTrainer: starting (interval: ${this.intervalMs}ms)`);
        this._run(); // run immediately on start
        this._timer = setInterval(() => this._run(), this.intervalMs);
        return this;
    }

    stop() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
            logger.info('ModelTrainer: stopped');
        }
    }
}

export default new ModelTrainer({
    predictionService: predictionContainer.services.predictionService,
    intervalMs: parseInt(process.env.MODEL_TRAINING_INTERVAL_MS) || 3_600_000,
});
