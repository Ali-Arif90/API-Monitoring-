/**
 * DowntimePredictor — predicts probability of API downtime using
 * a logistic regression model trained on error rate + latency features.
 * Pure JavaScript — no external ML dependencies.
 */
export class DowntimePredictor {
    constructor() {
        // Weights: [bias, error_rate_1h, error_rate_trend, latency_ratio, high_error_spike]
        // Pre-initialised with sensible priors; updated during train()
        this._weights = [
            -3.0,   // bias (low base probability)
             4.5,   // error_rate_1h (strong positive predictor)
             2.0,   // error_rate_trend (rising errors = danger)
             1.5,   // latency_ratio (current / baseline)
             3.0,   // high_error_spike (any bucket with >50% errors in last 3h)
        ];
        this._trained = false;
        this._learningRate = 0.05;
        this._epochs = 500;
    }

    /**
     * Sigmoid activation function.
     */
    _sigmoid(z) {
        return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
    }

    /**
     * Compute feature vector from a metrics history window.
     * @param {Object[]} history - Last N hourly metrics rows (newest last)
     * @returns {number[]} feature vector [1, error_rate_1h, error_rate_trend, latency_ratio, high_error_spike]
     */
    extractFeatures(history) {
        if (!history || history.length === 0) return [1, 0, 0, 1, 0];

        // error_rate_1h — error rate in most recent bucket
        const latest = history[history.length - 1];
        const totalLatest = parseFloat(latest.total_hits) || 1;
        const errorLatest = parseFloat(latest.error_hits) || 0;
        const errorRate1h = errorLatest / totalLatest;

        // error_rate_trend — linear slope of error rates over window
        const errorRates = history.map(h => {
            const total = parseFloat(h.total_hits) || 1;
            const errors = parseFloat(h.error_hits) || 0;
            return errors / total;
        });
        const trend = this._linearSlope(errorRates);

        // latency_ratio — current avg latency / baseline avg latency
        const baselineLatency = history.slice(0, Math.max(1, history.length - 3))
            .reduce((sum, h) => sum + (parseFloat(h.avg_latency) || 0), 0) / Math.max(1, history.length - 3);
        const currentLatency = parseFloat(latest.avg_latency) || 0;
        const latencyRatio = baselineLatency > 0 ? currentLatency / baselineLatency : 1;

        // high_error_spike — 1 if any of last 3 buckets has > 50% error rate
        const recentWindow = history.slice(-3);
        const highErrorSpike = recentWindow.some(h => {
            const t = parseFloat(h.total_hits) || 1;
            const e = parseFloat(h.error_hits) || 0;
            return e / t > 0.5;
        }) ? 1 : 0;

        return [
            1,
            Math.min(1, errorRate1h),
            Math.min(1, Math.max(-1, trend)),
            Math.min(5, latencyRatio),
            highErrorSpike,
        ];
    }

    /**
     * Compute linear slope of a small series (least-squares).
     */
    _linearSlope(series) {
        const n = series.length;
        if (n < 2) return 0;
        const xMean = (n - 1) / 2;
        const yMean = series.reduce((a, b) => a + b, 0) / n;
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) {
            num += (i - xMean) * (series[i] - yMean);
            den += Math.pow(i - xMean, 2);
        }
        return den > 0 ? num / den : 0;
    }

    /**
     * Train the logistic regression on labelled windows.
     * @param {Array<{features: number[], label: number}>} trainingData
     */
    train(trainingData) {
        if (!trainingData || trainingData.length < 5) {
            this._trained = false;
            return this;
        }

        const lr = this._learningRate;
        const w = [...this._weights];

        for (let epoch = 0; epoch < this._epochs; epoch++) {
            const gradients = new Array(w.length).fill(0);
            let totalLoss = 0;

            for (const { features, label } of trainingData) {
                const z = features.reduce((sum, f, i) => sum + f * w[i], 0);
                const pred = this._sigmoid(z);
                const error = pred - label;
                totalLoss -= label * Math.log(pred + 1e-10) + (1 - label) * Math.log(1 - pred + 1e-10);
                for (let i = 0; i < w.length; i++) {
                    gradients[i] += error * features[i];
                }
            }

            // Update weights with gradient descent + L2 regularisation
            for (let i = 0; i < w.length; i++) {
                w[i] -= lr * (gradients[i] / trainingData.length + 0.01 * w[i]);
            }

            if (epoch % 100 === 0 && totalLoss / trainingData.length < 0.01) break;
        }

        this._weights = w;
        this._trained = true;
        return this;
    }

    /**
     * Generate labelled training data from historical metrics.
     * A window is labelled 1 (downtime risk) if error_rate > 30% OR
     * the next bucket has error_rate > 40% (predictive labelling).
     */
    generateTrainingData(allHistory) {
        if (!allHistory || allHistory.length < 10) return [];
        const data = [];
        for (let i = 5; i < allHistory.length - 1; i++) {
            const window = allHistory.slice(i - 5, i);
            const next = allHistory[i];
            const nextTotal = parseFloat(next.total_hits) || 1;
            const nextErrors = parseFloat(next.error_hits) || 0;
            const nextErrorRate = nextErrors / nextTotal;
            const label = nextErrorRate > 0.40 ? 1 : 0;
            data.push({ features: this.extractFeatures(window), label });
        }
        return data;
    }

    /**
     * Predict downtime probability for next 15min and 60min horizons.
     * @param {Object[]} recentHistory - Last N hourly metrics
     * @returns {{ prob15m: number, prob60m: number, risk: string, features: number[] }}
     */
    predict(recentHistory) {
        const features = this.extractFeatures(recentHistory);
        const z = features.reduce((sum, f, i) => sum + f * this._weights[i], 0);
        const prob = this._sigmoid(z);

        // 60m horizon uses slightly dampened probability (uncertainty increases)
        const prob60m = Math.min(1, prob * 1.2);

        let risk = 'low';
        if (prob >= 0.7) risk = 'critical';
        else if (prob >= 0.45) risk = 'high';
        else if (prob >= 0.25) risk = 'medium';

        return {
            prob15m: parseFloat(prob.toFixed(4)),
            prob60m: parseFloat(prob60m.toFixed(4)),
            risk,
            features,
            trained: this._trained,
        };
    }
}
