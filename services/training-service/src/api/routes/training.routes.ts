import { Router } from 'express';
import { TrainingController } from '../controllers/training.controller';
import { validationMiddleware } from '../middleware/validation.middleware';
import { TrainingValidator } from '../validators/training.validator';

export function createTrainingRoutes(controller: TrainingController): Router {
    const router = Router();

    router.post(
        '/start',
        validationMiddleware(TrainingValidator.validateStartRequest),
        controller.start.bind(controller)
    );

    router.post(
        '/:id/complete',
        validationMiddleware(TrainingValidator.validateCompleteRequest),
        controller.complete.bind(controller)
    );

    router.get(
        '/progress/:learnerId',
        validationMiddleware((data) => TrainingValidator.validateIdParam(data, 'learnerId'), 'params'),
        controller.getProgress.bind(controller)
    );

    router.get(
        '/eligibility/:learnerId',
        validationMiddleware((data) => TrainingValidator.validateIdParam(data, 'learnerId'), 'params'),
        controller.checkEligibility.bind(controller)
    );

    router.get(
        '/available',
        controller.getAvailableModules.bind(controller)
    );

    router.post(
        '/:id/progress',
        controller.trackProgress.bind(controller)
    );

    return router;
}
