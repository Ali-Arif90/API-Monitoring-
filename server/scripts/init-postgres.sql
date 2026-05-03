CREATE TABLE IF NOT EXISTS endpoint_metrics (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(24) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    time_bucket TIMESTAMP NOT NULL,
    total_hits INTEGER DEFAULT 0,
    error_hits INTEGER DEFAULT 0,
    avg_latency NUMERIC(10,3) DEFAULT 0.000,
    min_latency NUMERIC(10,3) DEFAULT 0.000,
    max_latency NUMERIC(10,3) DEFAULT 0.000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id, service_name, endpoint, method, time_bucket) -- Inseert | Update
);

-- 10:25 => 1 req (Time Roundoff) [10:00        11:00]

CREATE INDEX IF NOT EXISTS idx_endpoint_metrics_client_id ON endpoint_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_metrics_service ON endpoint_metrics(client_id, service_name);
CREATE INDEX IF NOT EXISTS idx_endpoint_metrics_time ON endpoint_metrics(time_bucket);
CREATE INDEX IF NOT EXISTS idx_endpoint_metrics_endpoint ON endpoint_metrics(client_id, service_name, endpoint);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_endpoint_metrics_updated_at ON endpoint_metrics;
CREATE TRIGGER update_endpoint_metrics_updated_at BEFORE UPDATE ON endpoint_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ═══════════════════════════════════════════════════════════════════════════
-- AI PREDICTION ENGINE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Stores model output forecasts (traffic, downtime probability, latency trend)
CREATE TABLE IF NOT EXISTS predictions (
    id                SERIAL PRIMARY KEY,
    client_id         VARCHAR(24) NOT NULL,
    service_name      VARCHAR(255) NOT NULL,
    endpoint          VARCHAR(500) NOT NULL,
    method            VARCHAR(10) NOT NULL DEFAULT 'ALL',
    prediction_type   VARCHAR(50) NOT NULL,  -- 'traffic' | 'downtime' | 'latency'
    predicted_value   NUMERIC(12,4) DEFAULT 0,
    confidence_score  NUMERIC(5,4) DEFAULT 0,  -- 0.0 to 1.0
    horizon_minutes   INTEGER DEFAULT 60,
    time_bucket       TIMESTAMP NOT NULL,
    metadata          JSONB DEFAULT '{}',
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (client_id, service_name, endpoint, method, prediction_type, time_bucket)
);

CREATE INDEX IF NOT EXISTS idx_predictions_client      ON predictions(client_id);
CREATE INDEX IF NOT EXISTS idx_predictions_type_bucket ON predictions(client_id, prediction_type, time_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_endpoint    ON predictions(client_id, service_name, endpoint);

-- Stores detected anomalies (error_rate spikes, latency outliers, traffic surges)
CREATE TABLE IF NOT EXISTS anomalies (
    id            SERIAL PRIMARY KEY,
    client_id     VARCHAR(24) NOT NULL,
    service_name  VARCHAR(255) NOT NULL,
    endpoint      VARCHAR(500) NOT NULL,
    method        VARCHAR(10)  NOT NULL DEFAULT 'ALL',
    anomaly_type  VARCHAR(50)  NOT NULL,  -- 'error_rate' | 'latency' | 'traffic'
    severity      VARCHAR(20)  NOT NULL DEFAULT 'info',  -- 'info' | 'warning' | 'critical'
    z_score       NUMERIC(8,4) DEFAULT 0,
    details       JSONB DEFAULT '{}',
    is_active     BOOLEAN DEFAULT true,
    detected_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_anomalies_client_active ON anomalies(client_id, is_active, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_endpoint      ON anomalies(client_id, service_name, endpoint);

-- Stores fired alerts (decoupled from anomalies for multi-channel delivery)
CREATE TABLE IF NOT EXISTS alerts (
    id               SERIAL PRIMARY KEY,
    client_id        VARCHAR(24) NOT NULL,
    anomaly_id       INTEGER REFERENCES anomalies(id) ON DELETE SET NULL,
    title            VARCHAR(500) NOT NULL,
    message          TEXT NOT NULL,
    severity         VARCHAR(20) NOT NULL DEFAULT 'info',
    acknowledged_at  TIMESTAMP,
    acknowledged_by  VARCHAR(255),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_client_unacked ON alerts(client_id, acknowledged_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity       ON alerts(client_id, severity, created_at DESC);

-- Trigger to auto-update updated_at on predictions
CREATE OR REPLACE FUNCTION update_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_predictions_updated_at ON predictions;
CREATE TRIGGER update_predictions_updated_at
    BEFORE UPDATE ON predictions
    FOR EACH ROW EXECUTE FUNCTION update_predictions_updated_at();
