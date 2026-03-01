
import { Router } from 'express';
import { IdempotencyMiddleware } from '@shared/middleware/idempotency';
// Assuming a PayoutController exists or will be created
// For now, placeholders for payout routes

const idempotencyMiddleware = new IdempotencyMiddleware(process.env.REDIS_URL!);

export function createPayoutRoutes(payoutController: any): Router {
    const router = Router();

    router.use(idempotencyMiddleware.middleware());

    router.post('/', (req, res) => payoutController.createPayout(req, res));
    router.get('/:id', (req, res) => payoutController.getPayout(req, res));
    router.get('/seller/:sellerId', (req, res) => payoutController.getSellerPayouts(req, res));

    return router;
}
