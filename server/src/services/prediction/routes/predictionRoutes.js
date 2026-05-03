import { Router } from 'express';
import authenticate from '../../../shared/middlewares/authenticate.js';
import predictionContainer from '../Dependencies/dependencies.js';

const router = Router();
const ctrl = predictionContainer.controllers.predictionController;

const handle = (method) => (req, res, next) => ctrl[method](req, res, next);

// All prediction routes require authentication
router.use(authenticate);

router.get('/anomalies',            handle('getAnomalies'));
router.get('/downtime',             handle('getDowntimePredictions'));
router.get('/traffic',              handle('getTrafficForecast'));
router.get('/performance',          handle('getPerformanceData'));
router.get('/alerts',               handle('getAlerts'));
router.get('/alerts/stats',         handle('getAlertStats'));
router.patch('/alerts/:id/acknowledge', handle('acknowledgeAlert'));
router.get('/health-score',         handle('getHealthScore'));
router.get('/metrics/summary',      handle('getMetricsSummary'));
router.get('/metrics/hourly',       handle('getHourlyTraffic'));
router.post('/run-cycle',           handle('runPredictionCycle'));

export default router;
