import { Router } from 'express';
import { container } from '../infrastructure/container';
import { TYPES } from '../infrastructure/types';
import { SmsController } from './controllers/sms.controller';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { errorHandler, validationErrorHandler } from './middleware/error.middleware';

export const createSmsRouter = (): Router => {
    const router = Router();
    const smsController = container.get<SmsController>(TYPES.SmsController);

    // Webhooks
    router.post('/webhook/meseji', smsController.webhookMeseji.bind(smsController));

    // Bind controller methods to router (protected)
    router.use(requireAuth);
    router.post('/send', smsController.send.bind(smsController));
    router.get('/status/:messageId', smsController.getStatus.bind(smsController));
    router.post('/retry/failed', smsController.retryFailed.bind(smsController));
    router.post('/retry/:messageId', smsController.retryMessage.bind(smsController));
    router.get('/statistics', smsController.getStatistics.bind(smsController));

    router.use(validationErrorHandler);
    router.use(errorHandler);

    return router;
};
