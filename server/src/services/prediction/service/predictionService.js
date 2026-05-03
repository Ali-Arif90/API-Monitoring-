import { AnomalyDetector } from '../models/AnomalyDetector.js';
import { TrafficForecaster } from '../models/TrafficForecaster.js';
import { DowntimePredictor } from '../models/DowntimePredictor.js';
import { PerformanceRegressor } from '../models/PerformanceRegressor.js';

/**
 * PredictionService — orchestrates all ML models, runs predictions,
 * persists results, and fires alerts.
 */
export class PredictionService {
    constructor({ predictionRepository, logger, config }) {
        this.repo = predictionRepository;
        this.logger = logger;
        this.config = config;

        // Model instances — one per endpoint key for independent state
        this._forecasters = new Map();
        this._downtimePredictors = new Map();

        // Shared detectors (stateless — recalculate each run)
        this.anomalyDetector = new AnomalyDetector({
            zScoreThreshold: parseFloat(config?.anomalyZScoreThreshold) || 2.5,
            ewmaAlpha: 0.3,
            minDataPoints: 5,
        });

        this.performanceRegressor = new PerformanceRegressor({
            slaThresholdMs: parseInt(config?.latencySlaMs) || 500,
            windowSize: 24,
            minPoints: 6,
        });
    }

    // ─── MODEL TRAINING ───────────────────────────────────────────────────────

    /**
     * Re-trains all models for all active endpoints for a given clientId.
     * Called by ModelTrainer cron job every hour.
     */
    async trainModels(clientId) {
        try {
            const endpoints = await this.repo.getActiveEndpoints(clientId);
            let trained = 0;

            for (const { service_name: svc, endpoint, method } of endpoints) {
                const key = `${clientId}:${svc}:${endpoint}:${method}`;
                const history = await this.repo.getEndpointHistory(clientId, { serviceName: svc, endpoint, hours: 24 * 14 });

                if (history.length < 10) continue;

                // Traffic Forecaster
                const forecaster = new TrafficForecaster({ alpha: 0.3, beta: 0.1, gamma: 0.2, period: 24 });
                forecaster.train(history.map(h => parseFloat(h.total_hits) || 0));
                this._forecasters.set(key, forecaster);

                // Downtime Predictor
                const predictor = new DowntimePredictor();
                const trainingData = predictor.generateTrainingData(history);
                if (trainingData.length >= 5) predictor.train(trainingData);
                this._downtimePredictors.set(key, predictor);

                trained++;
            }

            this.logger.info(`Model training complete for client ${clientId}: ${trained} endpoint models trained`);
            return trained;
        } catch (error) {
            this.logger.error('Model training error:', error);
            throw error;
        }
    }

    // ─── PREDICTION CYCLE ─────────────────────────────────────────────────────

    /**
     * Run a full prediction cycle for a clientId.
     * Called by PredictionScheduler every 5 minutes.
     */
    async runPredictionCycle(clientId) {
        try {
            const endpoints = await this.repo.getActiveEndpoints(clientId);
            const results = { anomalies: 0, predictions: 0, alerts: 0 };

            for (const { service_name: svc, endpoint, method } of endpoints) {
                const history = await this.repo.getEndpointHistory(clientId, { serviceName: svc, endpoint, hours: 48 });
                if (history.length < 3) continue;

                // 1. Anomaly Detection
                const anomalyResult = await this._detectAndPersistAnomalies(clientId, svc, endpoint, method, history);
                results.anomalies += anomalyResult.count;
                results.alerts += anomalyResult.alerts;

                // 2. Downtime Prediction
                await this._runDowntimePrediction(clientId, svc, endpoint, method, history);
                results.predictions++;

                // 3. Traffic Forecast
                await this._runTrafficForecast(clientId, svc, endpoint, method, history);

                // 4. Performance Analysis
                await this._runPerformanceAnalysis(clientId, svc, endpoint, method, history);
            }

            // Cleanup stale anomalies
            await this.repo.resolveOldAnomalies(clientId, 4);

            this.logger.info(`Prediction cycle complete for ${clientId}:`, results);
            return results;
        } catch (error) {
            this.logger.error('Prediction cycle error:', error);
            throw error;
        }
    }

    async _detectAndPersistAnomalies(clientId, svc, endpoint, method, history) {
        const analysis = this.anomalyDetector.analyseEndpoint(history);
        let count = 0, alerts = 0;
        const threshold = parseFloat(this.config?.downtimeAlertThreshold) || 0.7;

        const checks = [
            { result: analysis.errorRate, type: 'error_rate' },
            { result: analysis.latency,   type: 'latency' },
            { result: analysis.traffic,   type: 'traffic' },
        ];

        for (const { result, type } of checks) {
            if (result.isAnomaly) {
                const anomaly = await this.repo.insertAnomaly({
                    clientId, serviceName: svc, endpoint, method, anomalyType: type,
                    severity: result.severity, zScore: result.zScore,
                    details: { currentValue: result.currentValue, mean: result.mean, std: result.std },
                });
                count++;

                // Fire alert for warning/critical
                if (result.severity === 'critical' || result.severity === 'warning') {
                    await this.repo.insertAlert({
                        clientId, anomalyId: anomaly.id,
                        title: `${result.severity.toUpperCase()}: ${type.replace(/_/g, ' ')} anomaly on ${endpoint}`,
                        message: `${svc} ${endpoint} — ${type} is ${result.currentValue.toFixed(2)} (z-score: ${result.zScore})`,
                        severity: result.severity,
                    });
                    alerts++;
                }
            }
        }
        return { count, alerts };
    }

    async _runDowntimePrediction(clientId, svc, endpoint, method, history) {
        const key = `${clientId}:${svc}:${endpoint}:${method}`;
        const predictor = this._downtimePredictors.get(key) || new DowntimePredictor();
        const { prob15m, prob60m, risk } = predictor.predict(history.slice(-12));
        const timeBucket = this._roundToHour(new Date());

        await this.repo.upsertPrediction({
            clientId, serviceName: svc, endpoint, method, predictionType: 'downtime',
            predictedValue: prob60m, confidenceScore: predictor._trained ? 0.75 : 0.5,
            horizonMinutes: 60, timeBucket,
            metadata: { prob15m, prob60m, risk },
        });

        // Fire critical alert if downtime likely
        const alertThreshold = parseFloat(this.config?.downtimeAlertThreshold) || 0.7;
        if (prob60m >= alertThreshold) {
            await this.repo.insertAlert({
                clientId, anomalyId: null,
                title: `CRITICAL: Downtime risk on ${endpoint}`,
                message: `${svc} ${endpoint} has ${(prob60m * 100).toFixed(0)}% downtime probability in next 60min`,
                severity: 'critical',
            });
        }
    }

    async _runTrafficForecast(clientId, svc, endpoint, method, history) {
        const key = `${clientId}:${svc}:${endpoint}:${method}`;
        const forecaster = this._forecasters.get(key);
        if (!forecaster) return;

        const { forecast, lower, upper, confidence } = forecaster.forecast(24);
        const timeBucket = this._roundToHour(new Date());

        await this.repo.upsertPrediction({
            clientId, serviceName: svc, endpoint, method, predictionType: 'traffic',
            predictedValue: forecast[0], confidenceScore: confidence,
            horizonMinutes: 24 * 60, timeBucket,
            metadata: { forecast, lower, upper, confidence },
        });
    }

    async _runPerformanceAnalysis(clientId, svc, endpoint, method, history) {
        const analysis = this.performanceRegressor.analyse(history);
        const timeBucket = this._roundToHour(new Date());

        await this.repo.upsertPrediction({
            clientId, serviceName: svc, endpoint, method, predictionType: 'latency',
            predictedValue: analysis.currentLatency, confidenceScore: analysis.rSquared,
            horizonMinutes: analysis.hoursToSLABreach ? analysis.hoursToSLABreach * 60 : 0,
            timeBucket, metadata: analysis,
        });

        // Alert on degrading performance close to SLA breach
        if (analysis.isDegrading && analysis.slaBreachProbability > 0.5) {
            await this.repo.insertAlert({
                clientId, anomalyId: null,
                title: `WARNING: Latency degradation on ${endpoint}`,
                message: `${svc} ${endpoint} — current ${analysis.currentLatency}ms, trend: ${analysis.trend}${analysis.hoursToSLABreach ? `, SLA breach in ~${analysis.hoursToSLABreach}h` : ''}`,
                severity: 'warning',
            });
        }
    }

    _roundToHour(date) {
        const d = new Date(date);
        d.setMinutes(0, 0, 0);
        return d;
    }

    // ─── PUBLIC API METHODS ───────────────────────────────────────────────────

    async getAnomalies(clientId, hours = 24) {
        return this.repo.getActiveAnomalies(clientId, hours);
    }

    async getDowntimePredictions(clientId, serviceName) {
        return this.repo.getPredictions({ clientId, serviceName, predictionType: 'downtime', limit: 50 });
    }

    async getTrafficForecast(clientId) {
        return this.repo.getLatestForecasts(clientId, 24);
    }

    async getPerformanceData(clientId, serviceName) {
        return this.repo.getPredictions({ clientId, serviceName, predictionType: 'latency', limit: 50 });
    }

    async getAlerts(clientId, opts) {
        return this.repo.getAlerts(clientId, opts);
    }

    async acknowledgeAlert(alertId, userId) {
        return this.repo.acknowledgeAlert(alertId, userId);
    }

    async getHealthScore(clientId) {
        return this.repo.computeHealthScore(clientId);
    }

    async getAlertStats(clientId, hours = 24) {
        return this.repo.getAlertStats(clientId, hours);
    }

    async getMetricsSummary(clientId, hours = 24) {
        return this.repo.getGlobalMetricsSummary(clientId, hours);
    }

    async getHourlyTraffic(clientId, hours = 168) {
        return this.repo.getHourlyTrafficHistory(clientId, hours);
    }
}
