/**
 * TrafficForecaster — Holt-Winters Triple Exponential Smoothing.
 * Handles trend + weekly seasonality (period = 24 for hourly data → 1 day,
 * or 168 for weekly seasonality).
 * Pure JavaScript — no external dependencies.
 */
export class TrafficForecaster {
    /**
     * @param {Object} opts
     * @param {number} opts.alpha   - Level smoothing (0-1)
     * @param {number} opts.beta    - Trend smoothing (0-1)
     * @param {number} opts.gamma   - Seasonal smoothing (0-1)
     * @param {number} opts.period  - Season length (24 for daily, 168 for weekly)
     */
    constructor({ alpha = 0.3, beta = 0.1, gamma = 0.2, period = 24 } = {}) {
        this.alpha = alpha;
        this.beta = beta;
        this.gamma = gamma;
        this.period = period;
        this._model = null;
    }

    /**
     * Train the Holt-Winters model on historical data.
     * @param {number[]} series - Ordered time-series of request counts (oldest first)
     */
    train(series) {
        if (!series || series.length < this.period * 2) {
            this._model = null;
            return this;
        }

        const p = this.period;

        // Initial level: mean of first season
        let level = series.slice(0, p).reduce((a, b) => a + b, 0) / p;

        // Initial trend: avg difference between first and second season means
        const season1Mean = series.slice(0, p).reduce((a, b) => a + b, 0) / p;
        const season2Mean = series.slice(p, 2 * p).reduce((a, b) => a + b, 0) / p;
        let trend = (season2Mean - season1Mean) / p;

        // Initial seasonal indices: first season normalised by level
        const seasonals = [];
        for (let i = 0; i < p; i++) {
            seasonals.push(level > 0 ? series[i] / level : 1);
        }

        // Run Holt-Winters update loop
        const fitted = [];
        for (let t = 0; t < series.length; t++) {
            const sIdx = t % p;
            const prevLevel = level;
            const prevTrend = trend;
            const prevSeasonal = seasonals[sIdx];

            const observation = series[t];
            const prevLevelPlusTrend = prevLevel + prevTrend;

            level = this.alpha * (observation / (prevSeasonal || 1)) + (1 - this.alpha) * prevLevelPlusTrend;
            trend = this.beta * (level - prevLevel) + (1 - this.beta) * prevTrend;
            seasonals[sIdx] = this.gamma * (observation / (level || 1)) + (1 - this.gamma) * prevSeasonal;

            fitted.push((prevLevelPlusTrend) * (prevSeasonal || 1));
        }

        this._model = { level, trend, seasonals: [...seasonals], fitted, seriesLength: series.length };
        return this;
    }

    /**
     * Forecast `horizon` steps ahead.
     * @param {number} horizon - Number of future periods to forecast
     * @returns {{ forecast: number[], lower: number[], upper: number[] }}
     */
    forecast(horizon = 24) {
        if (!this._model) {
            // Fallback: return zeros
            return {
                forecast: Array(horizon).fill(0),
                lower: Array(horizon).fill(0),
                upper: Array(horizon).fill(0),
                confidence: 0,
            };
        }

        const { level, trend, seasonals, fitted, seriesLength } = this._model;
        const p = this.period;

        // Compute residual std for confidence interval
        const residuals = fitted.map((f, i) => f - (this._series?.[i] ?? f));
        const residualStd = this._computeStd(residuals.filter(r => !isNaN(r)));

        const forecastValues = [];
        for (let h = 1; h <= horizon; h++) {
            const sIdx = (seriesLength + h - 1) % p;
            const value = (level + h * trend) * (seasonals[sIdx] || 1);
            forecastValues.push(Math.max(0, value));
        }

        // Widen bands with horizon (uncertainty increases over time)
        const lower = forecastValues.map((v, i) => Math.max(0, v - residualStd * Math.sqrt(i + 1)));
        const upper = forecastValues.map((v, i) => v + residualStd * Math.sqrt(i + 1));

        // Confidence: inversely related to coefficient of variation
        const forecastMean = forecastValues.reduce((a, b) => a + b, 0) / forecastValues.length;
        const cv = forecastMean > 0 ? residualStd / forecastMean : 1;
        const confidence = parseFloat(Math.max(0, Math.min(1, 1 - cv)).toFixed(3));

        return {
            forecast: forecastValues.map(v => parseFloat(v.toFixed(2))),
            lower: lower.map(v => parseFloat(v.toFixed(2))),
            upper: upper.map(v => parseFloat(v.toFixed(2))),
            confidence,
        };
    }

    /**
     * Find the expected peak hour in the next `horizon` windows.
     * @param {number} horizon
     * @returns {{ peakHourOffset: number, peakValue: number }}
     */
    findPeakWindow(horizon = 24) {
        const { forecast } = this.forecast(horizon);
        const peakHourOffset = forecast.indexOf(Math.max(...forecast));
        return { peakHourOffset, peakValue: forecast[peakHourOffset] };
    }

    _computeStd(arr) {
        if (!arr || arr.length === 0) return 0;
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
        return Math.sqrt(variance);
    }
}
