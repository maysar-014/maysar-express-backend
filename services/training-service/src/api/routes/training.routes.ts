import { Router } from 'express';
import { TrainingController } from '../controllers/training.controller';
import { validationMiddleware } from '../middleware/validation.middleware';
import { TrainingValidator } from '../validators/training.validator';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { asyncHandler } from '@shared/middleware/async-handler';

export function createTrainingRoutes(controller: TrainingController): Router {
    const router = Router();

    router.use(requireAuth);

    router.post(
        '/start',
        validationMiddleware(TrainingValidator.validateStartRequest),
        asyncHandler(controller.start.bind(controller))
    );

    router.post(
        '/:id/complete',
        validationMiddleware(TrainingValidator.validateCompleteRequest),
        asyncHandler(controller.complete.bind(controller))
    );

    router.get(
        '/progress/:learnerId',
        validationMiddleware((data) => TrainingValidator.validateIdParam(data, 'learnerId'), 'params'),
        asyncHandler(controller.getProgress.bind(controller))
    );

    router.get(
        '/eligibility/:learnerId',
        validationMiddleware((data) => TrainingValidator.validateIdParam(data, 'learnerId'), 'params'),
        asyncHandler(controller.checkEligibility.bind(controller))
    );

    router.get(
        '/available',
        asyncHandler(controller.getAvailableModules.bind(controller))
    );

    router.post(
        '/:id/progress',
        validationMiddleware((data) => TrainingValidator.validateIdParam(data, 'id'), 'params'),
        validationMiddleware(TrainingValidator.validateTrackProgressRequest),
        asyncHandler(controller.trackProgress.bind(controller))
    );

    return router;
}
