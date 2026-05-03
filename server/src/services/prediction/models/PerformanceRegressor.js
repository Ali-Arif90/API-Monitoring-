/**
 * PerformanceRegressor — detects latency degradation trends using
 * Ordinary Least Squares linear regression on a sliding window.
 * Predicts when latency will breach the configured SLA threshold.
 * Pure JavaScript — no external dependencies.
 */
export class PerformanceRegressor {
    /**
     * @param {Object} opts
     * @param {number} opts.slaThresholdMs  - SLA latency limit in milliseconds (default 500)
     * @param {number} opts.windowSize      - Rolling window size in hours (default 24)
     * @param {number} opts.minPoints       - Min points needed for regression (default 6)
     */
    constructor({ slaThresholdMs = 500, windowSize = 24, minPoints = 6 } = {}) {
        this.slaThresholdMs = slaThresholdMs;
        this.windowSize = windowSize;
        this.minPoints = minPoints;
    }

    /**
     * Ordinary Least Squares (OLS) linear regression.
     * @param {number[]} x - Independent variable (time index)
     * @param {number[]} y - Dependent variable (latency)
     * @returns {{ slope: number, intercept: number, rSquared: number }}
     */
    _ols(x, y) {
        const n = x.length;
        if (n < 2) return { slope: 0, intercept: y[0] ?? 0, rSquared: 0 };

        const xMean = x.reduce((a, b) => a + b, 0) / n;
        const yMean = y.reduce((a, b) => a + b, 0) / n;

        let sxy = 0, sxx = 0, ssTotal = 0, ssRes = 0;
        for (let i = 0; i < n; i++) {
            sxy += (x[i] - xMean) * (y[i] - yMean);
            sxx += Math.pow(x[i] - xMean, 2);
        }

        const slope = sxx > 0 ? sxy / sxx : 0;
        const intercept = yMean - slope * xMean;

        for (let i = 0; i < n; i++) {
            const predicted = slope * x[i] + intercept;
            ssRes += Math.pow(y[i] - predicted, 2);
            ssTotal += Math.pow(y[i] - yMean, 2);
        }

        const rSquared = ssTotal > 0 ? Math.max(0, 1 - ssRes / ssTotal) : 0;

        return { slope, intercept, rSquared };
    }

    /**
     * Analyse latency trend and predict SLA breach.
     * @param {Object[]} history - Hourly metrics rows (newest last)
     *   Each row: { time_bucket, avg_latency, max_latency, total_hits }
     * @returns {PerfAnalysis}
     */
    analyse(history) {
        if (!history || history.length < this.minPoints) {
            return {
                trend: 'insufficient_data',
                slope: 0,
                rSquared: 0,
                currentLatency: 0,
                predictedBreachAt: null,
                hoursToSLABreach: null,
                slaBreachProbability: 0,
                isDegradig: false,
                slaThresholdMs: this.slaThresholdMs,
            };
        }

        const window = history.slice(-this.windowSize);
        const x = window.map((_, i) => i);
        const y = window.map(h => parseFloat(h.avg_latency) || 0);

        const { slope, intercept, rSquared } = this._ols(x, y);
        const currentLatency = y[y.length - 1];
        const n = x.length;

        // Predict at what future step latency crosses slaThresholdMs
        let hoursToSLABreach = null;
        let predictedBreachAt = null;

        if (slope > 0 && currentLatency < this.slaThresholdMs) {
            // Steps until breach: (sla - currentValue) / slope
            const stepsToBreachFromEnd = (this.slaThresholdMs - (slope * (n - 1) + intercept)) / slope;
            if (stepsToBreachFromEnd > 0 && stepsToBreachFromEnd < 720) {
                // 720 hours = 30 days max horizon
                hoursToSLABreach = parseFloat(stepsToBreachFromEnd.toFixed(1));
                predictedBreachAt = new Date(Date.now() + hoursToSLABreach * 3600 * 1000).toISOString();
            }
        } else if (currentLatency >= this.slaThresholdMs) {
            hoursToSLABreach = 0;
            predictedBreachAt = new Date().toISOString();
        }

        // Trend classification
        let trend = 'stable';
        if (slope > 2 && rSquared > 0.4) trend = 'degrading_fast';
        else if (slope > 0.5 && rSquared > 0.3) trend = 'degrading';
        else if (slope < -1 && rSquared > 0.3) trend = 'improving';

        // SLA breach probability
        let slaBreachProbability = 0;
        if (currentLatency >= this.slaThresholdMs) {
            slaBreachProbability = 1;
        } else if (hoursToSLABreach !== null) {
            // Higher probability the closer the breach
            slaBreachProbability = parseFloat(Math.min(0.99, Math.max(0, 1 - hoursToSLABreach / 168)).toFixed(3));
        } else if (slope > 0) {
            slaBreachProbability = parseFloat(Math.min(0.3, slope * rSquared * 0.1).toFixed(3));
        }

        // Percentile stats for display
        const sorted = [...y].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? currentLatency;
        const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? currentLatency;

        return {
            trend,
            slope: parseFloat(slope.toFixed(4)),
            rSquared: parseFloat(rSquared.toFixed(4)),
            currentLatency: parseFloat(currentLatency.toFixed(2)),
            avgLatency: parseFloat((y.reduce((a, b) => a + b, 0) / y.length).toFixed(2)),
            maxLatency: parseFloat(Math.max(...y).toFixed(2)),
            p95Latency: parseFloat(p95.toFixed(2)),
            p99Latency: parseFloat(p99.toFixed(2)),
            predictedBreachAt,
            hoursToSLABreach,
            slaBreachProbability,
            isDegrading: trend === 'degrading' || trend === 'degrading_fast',
            slaThresholdMs: this.slaThresholdMs,
        };
    }
}
