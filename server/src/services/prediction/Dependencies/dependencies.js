import postgres from '../../../shared/config/postgres.js';
import logger from '../../../shared/config/logger.js';
import config from '../../../shared/config/index.js';
import { PredictionRepository } from '../repository/PredictionRepository.js';
import { PredictionService } from '../service/predictionService.js';
import { PredictionController } from '../controller/predictionController.js';

const predictionRepository = new PredictionRepository({ postgres, logger });

const predictionService = new PredictionService({
    predictionRepository,
    logger,
    config: {
        anomalyZScoreThreshold: config.prediction?.zScoreThreshold,
        downtimeAlertThreshold: config.prediction?.downtimeAlertThreshold,
        latencySlaMs: config.prediction?.latencySlaMs,
    },
});

const predictionController = new PredictionController({ predictionService });

const predictionContainer = {
    repositories: { predictionRepository },
    services: { predictionService },
    controllers: { predictionController },
};

export default predictionContainer;
