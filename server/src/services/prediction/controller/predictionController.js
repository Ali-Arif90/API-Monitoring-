import ResponseFormatter from '../../../shared/utils/responseFormatter.js';

export class PredictionController {
    constructor({ predictionService }) {
        if (!predictionService) throw new Error('PredictionController requires predictionService');
        this.svc = predictionService;
    }

    async getAnomalies(req, res, next) {
        try {
            const clientId = req.user.clientId || req.query.clientId;
            const hours = parseInt(req.query.hours) || 24;
            const data = await this.svc.getAnomalies(clientId, hours);
            res.json(ResponseFormatter.success(data, 'Anomalies retrieved'));
        } catch (e) { next(e); }
    }

    async getDowntimePredictions(req, res, next) {
        try {
            const clientId = req.user.clientId || req.query.clientId;
            const { serviceName } = req.query;
            const data = await this.svc.getDowntimePredictions(clientId, serviceName);
            res.json(ResponseFormatter.success(data, 'Downtime predictions retrieved'));
        } catch (e) { next(e); }
    }

    async getTrafficForecast(req, res, next) {
        try {
            const clientId = req.user.clientId || req.query.clientId;
            const data = await this.svc.getTrafficForecast(clientId);
            res.json(ResponseFormatter.success(data, 'Traffic forecast retrieved'));
        } catch (e) { next(e); }
    }

    async getPerformanceData(req, res, next) {
        try {
            const clientId = req.user.clientId || req.query.clientId;
            const { serviceName } = req.query;
            const data = await this.svc.getPerformanceData(clientId, serviceName);
            res.json(ResponseFormatter.success(data, 'Performance data retrieved'));
        } catch (e) { next(e); }
    }

    async getAlerts(req, res, next) {
        try {
            const clientId = req.user.clientId || req.query.clientId;
            const { limit = 50, offset = 0, severity } = req.query;
            const data = await this.svc.getAlerts(clientId, { limit: parseInt(limit), offset: parseInt(offset), severity });
            res.json(ResponseFormatter.success(data, 'Alerts retrieved'));
        } catch (e) { next(e); }
    }

    async acknowledgeAlert(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const data = await this.svc.acknowledgeAlert(parseInt(id), userId);
            res.json(ResponseFormatter.success(data, 'Alert acknowledged'));
        } catch (e) { next(e); }
    }

    async getHealthScore(req, res, next) {
        try {
            const clientId = req.user.clientId || req.query.clientId;
            const data = await this.svc.getHealthScore(clientId);
            res.json(ResponseFormatter.success(data, 'Health score retrieved'));
        } catch (e) { next(e); }
    }

    async getAlertStats(req, res, next) {
        try {
            const clientId = req.user.clientId || req.query.clientId;
            const hours = parseInt(req.query.hours) || 24;
            const data = await this.svc.getAlertStats(clientId, hours);
            res.json(ResponseFormatter.success(data, 'Alert stats retrieved'));
        } catch (e) { next(e); }
    }

    async getMetricsSummary(req, res, next) {
        try {
            const clientId = req.user.clientId || req.query.clientId;
            const hours = parseInt(req.query.hours) || 24;
            const data = await this.svc.getMetricsSummary(clientId, hours);
            res.json(ResponseFormatter.success(data, 'Metrics summary retrieved'));
        } catch (e) { next(e); }
    }

    async getHourlyTraffic(req, res, next) {
        try {
            const clientId = req.user.clientId || req.query.clientId;
            const hours = parseInt(req.query.hours) || 168;
            const data = await this.svc.getHourlyTraffic(clientId, hours);
            res.json(ResponseFormatter.success(data, 'Hourly traffic retrieved'));
        } catch (e) { next(e); }
    }

    async runPredictionCycle(req, res, next) {
        try {
            const clientId = req.user.clientId || req.body.clientId;
            const result = await this.svc.runPredictionCycle(clientId);
            res.json(ResponseFormatter.success(result, 'Prediction cycle completed'));
        } catch (e) { next(e); }
    }
}
