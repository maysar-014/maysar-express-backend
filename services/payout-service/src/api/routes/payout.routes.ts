import { Router } from 'express';
import { PayoutController } from '../controllers/payout.controller';

export function createPayoutRoutes(controller: PayoutController): Router {
    const router = Router();

    router.post('/', controller.initiate.bind(controller));
    router.get('/:id', controller.getPayout.bind(controller));
    router.post('/:id/cancel', controller.cancel.bind(controller));

    return router;
}
