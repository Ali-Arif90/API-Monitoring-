/**
 * AnomalyDetector — detects statistical anomalies in API metrics using
 * Exponentially Weighted Moving Average (EWMA) + Z-score.
 * Pure JavaScript — no external ML dependencies required.
 */
export class AnomalyDetector {
    /**
     * @param {Object} opts
     * @param {number} opts.zScoreThreshold  - Standard deviations above mean to flag anomaly (default 2.5)
     * @param {number} opts.ewmaAlpha        - Smoothing factor for EWMA (0-1, default 0.3)
     * @param {number} opts.minDataPoints    - Min history points required before flagging (default 5)
     */
    constructor({ zScoreThreshold = 2.5, ewmaAlpha = 0.3, minDataPoints = 5 } = {}) {
        this.zScoreThreshold = zScoreThreshold;
        this.ewmaAlpha = ewmaAlpha;
        this.minDataPoints = minDataPoints;
    }

    /**
     * Compute EWMA (Exponentially Weighted Moving Average) of a series.
     * @param {number[]} series
     * @returns {number[]}
     */
    computeEWMA(series) {
        if (!series || series.length === 0) return [];
        const result = [series[0]];
        for (let i = 1; i < series.length; i++) {
            const prev = result[i - 1];
            result.push(this.ewmaAlpha * series[i] + (1 - this.ewmaAlpha) * prev);
        }
        return result;
    }

    /**
     * Compute rolling mean and stddev over a window.
     */
    computeRollingStats(series, windowSize = 10) {
        const stats = [];
        for (let i = 0; i < series.length; i++) {
            const start = Math.max(0, i - windowSize + 1);
            const window = series.slice(start, i + 1);
            const mean = window.reduce((a, b) => a + b, 0) / window.length;
            const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / window.length;
            stats.push({ mean, std: Math.sqrt(variance) });
        }
        return stats;
    }

    /**
     * Detect anomalies in a time series.
     * @param {number[]} series   - Ordered array of metric values (newest last)
     * @param {string}   metric   - Name of the metric (for labelling)
     * @returns {{ isAnomaly: boolean, zScore: number, severity: string, currentValue: number, ewmaValue: number }}
     */
    detect(series, metric = 'value') {
        if (!series || series.length < this.minDataPoints) {
            return { isAnomaly: false, zScore: 0, severity: 'none', currentValue: series?.slice(-1)[0] ?? 0, ewmaValue: series?.slice(-1)[0] ?? 0, reason: 'insufficient_data' };
        }

        const ewma = this.computeEWMA(series);
        const stats = this.computeRollingStats(ewma, Math.min(20, series.length));

        const current = ewma[ewma.length - 1];
        const { mean, std } = stats[stats.length - 1];

        const zScore = std > 0 ? Math.abs((current - mean) / std) : 0;
        const isAnomaly = zScore >= this.zScoreThreshold;

        let severity = 'none';
        if (isAnomaly) {
            if (zScore >= this.zScoreThreshold * 2) severity = 'critical';
            else if (zScore >= this.zScoreThreshold * 1.4) severity = 'warning';
            else severity = 'info';
        }

        return {
            isAnomaly,
            zScore: parseFloat(zScore.toFixed(4)),
            severity,
            currentValue: parseFloat(series[series.length - 1].toFixed(4)),
            ewmaValue: parseFloat(current.toFixed(4)),
            mean: parseFloat(mean.toFixed(4)),
            std: parseFloat(std.toFixed(4)),
            metric,
        };
    }

    /**
     * Analyse a full metrics snapshot (error_rate + avg_latency).
     * @param {Object[]} history - Array of { time_bucket, error_rate, avg_latency, total_hits }
     * @returns {{ errorRate: Object, latency: Object, traffic: Object }}
     */
    analyseEndpoint(history) {
        if (!history || history.length === 0) {
            return { errorRate: { isAnomaly: false }, latency: { isAnomaly: false }, traffic: { isAnomaly: false } };
        }

        const errorRates = history.map(h => {
            const total = parseFloat(h.total_hits) || 0;
            const errors = parseFloat(h.error_hits) || 0;
            return total > 0 ? (errors / total) * 100 : 0;
        });

        const latencies = history.map(h => parseFloat(h.avg_latency) || 0);
        const traffic = history.map(h => parseFloat(h.total_hits) || 0);

        return {
            errorRate: this.detect(errorRates, 'error_rate'),
            latency: this.detect(latencies, 'avg_latency'),
            traffic: this.detect(traffic, 'total_hits'),
        };
    }
}
