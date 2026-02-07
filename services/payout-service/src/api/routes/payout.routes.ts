import { Router } from 'express';
import { PayoutController } from '../controllers/payout.controller';
import { AuthorizationMiddleware } from '../middleware/authorization.middleware';

export function createPayoutRoutes(controller: PayoutController): Router {
    const router = Router();

    router.post(
        '/',
        AuthorizationMiddleware.authorizeRoles(['seller', 'supplier', 'courier', 'enabler', 'system']),
        controller.initiate.bind(controller)
    );
    router.get('/:id', controller.getPayout.bind(controller));
    router.post('/:id/cancel', controller.cancel.bind(controller));

    return router;
}
