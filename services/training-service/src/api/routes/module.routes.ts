import { Router } from 'express';
import { ModuleController } from '../controllers/module.controller';
import { validationMiddleware } from '../middleware/validation.middleware';
import { TrainingValidator } from '../validators/training.validator';

export function createModuleRoutes(controller: ModuleController): Router {
    const router = Router();

    router.get('/', controller.list.bind(controller));

    router.get(
        '/:id',
        validationMiddleware(TrainingValidator.validateIdParam, 'params'),
        controller.get.bind(controller)
    );

    router.get(
        '/:id/content',
        validationMiddleware(TrainingValidator.validateIdParam, 'params'),
        controller.getContent.bind(controller)
    );

    return router;
}
