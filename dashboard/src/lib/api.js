const BASE = '/api';
let _token = null;

export function setToken(t) { _token = t; }
export function getToken()  { return _token; }

async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (_token) headers['Authorization'] = `Bearer ${_token}`;
    const res = await fetch(`${BASE}${path}`, {
        method, headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',   // send cookies for same-origin fallback
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const message = data?.message || data?.error || `HTTP ${res.status}`;
        const details = Array.isArray(data?.errors) ? `: ${data.errors.join('; ')}` : '';
        throw new Error(`${message}${details}`);
    }
    return data;
}

const get   = (p)     => request('GET',    p);
const post  = (p, b)  => request('POST',   p, b);
const patch = (p, b)  => request('PATCH',  p, b);
const del   = (p)     => request('DELETE', p);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
    // Backend returns { success, data: { user, token } }
    login:    (b) => post('/auth/login', b),
    register: (b) => post('/auth/register', b),
    logout:   ()  => post('/auth/logout'),
    me:       ()  => get('/auth/profile'),
};

// ── Client / API Key management ───────────────────────────────────────────────
export const clientApi = {
    getProfile:    ()    => get('/client/profile'),
    updateProfile: (b)   => patch('/client/profile', b),
    getApiKeys:    ()    => get('/client/api-keys'),
    createApiKey:  (b)   => post('/client/api-keys', b),
    revokeApiKey:  (id)  => del(`/client/api-keys/${id}`),
    getKeyStats:   (id)  => get(`/client/api-keys/${id}/stats`),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
    getHits:      (p = '') => get(`/client/analytics/hits${p}`),
    getEndpoints: (p = '') => get(`/client/analytics/endpoints${p}`),
    getMetrics:   (p = '') => get(`/client/analytics/metrics${p}`),
    getErrors:    (p = '') => get(`/client/analytics/errors${p}`),
    getLatency:   (p = '') => get(`/client/analytics/latency${p}`),
};

// ── Predictions ───────────────────────────────────────────────────────────────
export const predApi = {
    getAnomalies:      (h = 24)  => get(`/predictions/anomalies?hours=${h}`),
    getDowntime:       (svc = '') => get(`/predictions/downtime?serviceName=${svc}`),
    getTraffic:        ()         => get('/predictions/traffic'),
    getPerformance:    (svc = '') => get(`/predictions/performance?serviceName=${svc}`),
    getAlerts:         (p = '')   => get(`/predictions/alerts${p}`),
    getAlertStats:     (h = 24)  => get(`/predictions/alerts/stats?hours=${h}`),
    ackAlert:          (id)       => patch(`/predictions/alerts/${id}/acknowledge`, {}),
    getHealthScore:    ()         => get('/predictions/health-score'),
    getMetricsSummary: (h = 24)  => get(`/predictions/metrics/summary?hours=${h}`),
    getHourlyTraffic:  (h = 168) => get(`/predictions/metrics/hourly?hours=${h}`),
    runCycle:          ()         => post('/predictions/run-cycle', {}),
};
