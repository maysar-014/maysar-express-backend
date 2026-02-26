import { Router } from 'express';
import { container } from '../infrastructure/container';
import { TYPES } from '../infrastructure/types';
import { SmsController } from './controllers/sms.controller';

export const createSmsRouter = (): Router => {
    const router = Router();
    const smsController = container.get<SmsController>(TYPES.SmsController);

    // Bind controller methods to router
    router.post('/send', smsController.send.bind(smsController));
    router.get('/status/:messageId', smsController.getStatus.bind(smsController));
    router.post('/retry/failed', smsController.retryFailed.bind(smsController));
    router.post('/retry/:messageId', smsController.retryMessage.bind(smsController));
    router.get('/statistics', smsController.getStatistics.bind(smsController));

    // Webhooks
    router.post('/webhook/africastalking', smsController.webhookAfricastalking.bind(smsController));

    return router;
};
