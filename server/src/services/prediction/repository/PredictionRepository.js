const QUERY_TIMEOUT_MS = 30000;

/**
 * PredictionRepository — manages predictions, anomalies, and alerts tables in PostgreSQL.
 */
export class PredictionRepository {
    constructor({ postgres, logger }) {
        this.pg = postgres;
        this.logger = logger;
    }

    _query(sql, params = []) {
        return this.pg.query({ text: sql, values: params, statement_timeout: QUERY_TIMEOUT_MS });
    }

    // ─── PREDICTIONS ───────────────────────────────────────────────────────────

    async upsertPrediction(data) {
        const { clientId, serviceName, endpoint, method, predictionType, predictedValue, confidenceScore, horizonMinutes, timeBucket, metadata } = data;
        const sql = `
            INSERT INTO predictions (client_id, service_name, endpoint, method, prediction_type, predicted_value, confidence_score, horizon_minutes, time_bucket, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (client_id, service_name, endpoint, method, prediction_type, time_bucket)
            DO UPDATE SET
                predicted_value = EXCLUDED.predicted_value,
                confidence_score = EXCLUDED.confidence_score,
                metadata = EXCLUDED.metadata,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *`;
        const result = await this._query(sql, [clientId, serviceName, endpoint, method || 'ALL', predictionType, predictedValue, confidenceScore, horizonMinutes, timeBucket, JSON.stringify(metadata || {})]);
        return result.rows[0];
    }

    async getPredictions({ clientId, serviceName, endpoint, predictionType, limit = 100 }) {
        const params = [clientId];
        let where = 'WHERE client_id = $1';
        let idx = 2;
        if (serviceName) { where += ` AND service_name = $${idx++}`; params.push(serviceName); }
        if (endpoint)    { where += ` AND endpoint = $${idx++}`;     params.push(endpoint); }
        if (predictionType) { where += ` AND prediction_type = $${idx++}`; params.push(predictionType); }
        params.push(limit);
        const sql = `SELECT * FROM predictions ${where} ORDER BY time_bucket DESC LIMIT $${idx}`;
        const result = await this._query(sql, params);
        return result.rows;
    }

    async getLatestForecasts(clientId, horizon = 24) {
        const sql = `
            SELECT DISTINCT ON (service_name, endpoint, method)
                service_name, endpoint, method, predicted_value, confidence_score, metadata, time_bucket
            FROM predictions
            WHERE client_id = $1 AND prediction_type = 'traffic' AND horizon_minutes = $2
                AND time_bucket >= NOW() - INTERVAL '2 hours'
            ORDER BY service_name, endpoint, method, time_bucket DESC`;
        const result = await this._query(sql, [clientId, horizon * 60]);
        return result.rows;
    }

    // ─── ANOMALIES ─────────────────────────────────────────────────────────────

    async insertAnomaly(data) {
        const { clientId, serviceName, endpoint, method, anomalyType, severity, zScore, details } = data;
        const sql = `
            INSERT INTO anomalies (client_id, service_name, endpoint, method, anomaly_type, severity, z_score, details)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`;
        const result = await this._query(sql, [clientId, serviceName, endpoint, method || 'ALL', anomalyType, severity, zScore, JSON.stringify(details || {})]);
        return result.rows[0];
    }

    async getActiveAnomalies(clientId, hours = 24) {
        const sql = `
            SELECT * FROM anomalies
            WHERE client_id = $1 AND is_active = true AND detected_at >= NOW() - ($2 || ' hours')::INTERVAL
            ORDER BY detected_at DESC`;
        const result = await this._query(sql, [clientId, hours]);
        return result.rows;
    }

    async getAllAnomalies(clientId, { limit = 50, offset = 0 } = {}) {
        const sql = `SELECT * FROM anomalies WHERE client_id = $1 ORDER BY detected_at DESC LIMIT $2 OFFSET $3`;
        const result = await this._query(sql, [clientId, limit, offset]);
        return result.rows;
    }

    async resolveAnomaly(anomalyId) {
        const sql = `UPDATE anomalies SET is_active = false, resolved_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
        const result = await this._query(sql, [anomalyId]);
        return result.rows[0];
    }

    async resolveOldAnomalies(clientId, hours = 4) {
        const sql = `UPDATE anomalies SET is_active = false, resolved_at = CURRENT_TIMESTAMP
            WHERE client_id = $1 AND is_active = true AND detected_at < NOW() - ($2 || ' hours')::INTERVAL`;
        await this._query(sql, [clientId, hours]);
    }

    // ─── ALERTS ────────────────────────────────────────────────────────────────

    async insertAlert(data) {
        const { clientId, anomalyId, title, message, severity } = data;
        const sql = `
            INSERT INTO alerts (client_id, anomaly_id, title, message, severity)
            VALUES ($1, $2, $3, $4, $5) RETURNING *`;
        const result = await this._query(sql, [clientId, anomalyId || null, title, message, severity]);
        return result.rows[0];
    }

    async getAlerts(clientId, { limit = 50, offset = 0, severity } = {}) {
        const params = [clientId, limit, offset];
        let where = 'WHERE client_id = $1';
        if (severity) { where += ' AND severity = $4'; params.push(severity); }
        const sql = `SELECT * FROM alerts ${where} ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
        const result = await this._query(sql, params);
        return result.rows;
    }

    async acknowledgeAlert(alertId, acknowledgedBy) {
        const sql = `UPDATE alerts SET acknowledged_at = CURRENT_TIMESTAMP, acknowledged_by = $2 WHERE id = $1 RETURNING *`;
        const result = await this._query(sql, [alertId, acknowledgedBy]);
        return result.rows[0];
    }

    async getUnacknowledgedAlerts(clientId) {
        const sql = `SELECT * FROM alerts WHERE client_id = $1 AND acknowledged_at IS NULL ORDER BY created_at DESC LIMIT 100`;
        const result = await this._query(sql, [clientId]);
        return result.rows;
    }

    async getAlertStats(clientId, hours = 24) {
        const sql = `
            SELECT
                COUNT(*) as total_alerts,
                COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
                COUNT(*) FILTER (WHERE severity = 'warning')  as warning_count,
                COUNT(*) FILTER (WHERE severity = 'info')     as info_count,
                COUNT(*) FILTER (WHERE acknowledged_at IS NOT NULL) as acknowledged_count,
                AVG(EXTRACT(EPOCH FROM (acknowledged_at - created_at))/60) FILTER (WHERE acknowledged_at IS NOT NULL) as avg_ack_minutes
            FROM alerts
            WHERE client_id = $1 AND created_at >= NOW() - ($2 || ' hours')::INTERVAL`;
        const result = await this._query(sql, [clientId, hours]);
        return result.rows[0];
    }

    // ─── METRICS (read-only from endpoint_metrics) ────────────────────────────

    async getEndpointHistory(clientId, { serviceName, endpoint, hours = 48 } = {}) {
        const params = [clientId, hours];
        let where = `WHERE client_id = $1 AND time_bucket >= NOW() - ($2 || ' hours')::INTERVAL`;
        let idx = 3;
        if (serviceName) { where += ` AND service_name = $${idx++}`; params.push(serviceName); }
        if (endpoint)    { where += ` AND endpoint = $${idx++}`; params.push(endpoint); }
        const sql = `
            SELECT service_name, endpoint, method, time_bucket,
                   total_hits, error_hits, avg_latency, min_latency, max_latency
            FROM endpoint_metrics ${where}
            ORDER BY time_bucket ASC`;
        const result = await this._query(sql, params);
        return result.rows;
    }

    async getActiveEndpoints(clientId) {
        const sql = `
            SELECT DISTINCT service_name, endpoint, method
            FROM endpoint_metrics
            WHERE client_id = $1 AND time_bucket >= NOW() - INTERVAL '24 hours'
            ORDER BY service_name, endpoint`;
        const result = await this._query(sql, [clientId]);
        return result.rows;
    }

    async getGlobalMetricsSummary(clientId, hours = 24) {
        const sql = `
            SELECT
                SUM(total_hits)    AS total_requests,
                SUM(error_hits)    AS total_errors,
                AVG(avg_latency)   AS avg_latency,
                COUNT(DISTINCT service_name)  AS unique_services,
                COUNT(DISTINCT endpoint)      AS unique_endpoints
            FROM endpoint_metrics
            WHERE client_id = $1 AND time_bucket >= NOW() - ($2 || ' hours')::INTERVAL`;
        const result = await this._query(sql, [clientId, hours]);
        return result.rows[0];
    }

    async getHourlyTrafficHistory(clientId, hours = 168) {
        const sql = `
            SELECT time_bucket, SUM(total_hits) AS total_hits, SUM(error_hits) AS error_hits, AVG(avg_latency) AS avg_latency
            FROM endpoint_metrics
            WHERE client_id = $1 AND time_bucket >= NOW() - ($2 || ' hours')::INTERVAL
            GROUP BY time_bucket ORDER BY time_bucket ASC`;
        const result = await this._query(sql, [clientId, hours]);
        return result.rows;
    }

    // ─── HEALTH SCORE ──────────────────────────────────────────────────────────

    async computeHealthScore(clientId) {
        try {
            const [summary, activeAnomalies, unackedAlerts] = await Promise.all([
                this.getGlobalMetricsSummary(clientId, 1),
                this.getActiveAnomalies(clientId, 1),
                this.getUnacknowledgedAlerts(clientId),
            ]);

            const totalReqs = parseInt(summary?.total_requests) || 0;
            const totalErrors = parseInt(summary?.total_errors) || 0;
            const errorRate = totalReqs > 0 ? (totalErrors / totalReqs) : 0;
            const avgLatency = parseFloat(summary?.avg_latency) || 0;

            // Score starts at 100, deducted for errors, latency, anomalies, alerts
            let score = 100;
            score -= Math.min(40, errorRate * 200);       // up to -40 for error rate
            if (avgLatency > 1000) score -= 20;           // high latency
            else if (avgLatency > 500) score -= 10;
            score -= Math.min(20, activeAnomalies.length * 5);  // -5 per active anomaly
            score -= Math.min(10, unackedAlerts.length * 2);    // -2 per unacked alert

            const criticals = activeAnomalies.filter(a => a.severity === 'critical').length;
            score -= criticals * 10;

            return {
                score: Math.max(0, Math.round(score)),
                errorRate: parseFloat((errorRate * 100).toFixed(2)),
                avgLatency: parseFloat(avgLatency.toFixed(2)),
                activeAnomalies: activeAnomalies.length,
                unacknowledgedAlerts: unackedAlerts.length,
            };
        } catch {
            return { score: 50, errorRate: 0, avgLatency: 0, activeAnomalies: 0, unacknowledgedAlerts: 0 };
        }
    }

    // ─── CLEANUP ───────────────────────────────────────────────────────────────

    async cleanupOldData() {
        await Promise.all([
            this._query(`DELETE FROM predictions WHERE time_bucket < NOW() - INTERVAL '30 days'`),
            this._query(`DELETE FROM anomalies WHERE detected_at < NOW() - INTERVAL '90 days' AND is_active = false`),
            this._query(`DELETE FROM alerts WHERE created_at < NOW() - INTERVAL '90 days'`),
        ]);
    }
}
