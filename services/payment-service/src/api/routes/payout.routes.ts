
import { Router } from 'express';
// Assuming a PayoutController exists or will be created
// For now, placeholders for payout routes

export function createPayoutRoutes(payoutController: any): Router {
    const router = Router();

    router.post('/', (req, res) => payoutController.createPayout(req, res));
    router.get('/:id', (req, res) => payoutController.getPayout(req, res));
    router.get('/seller/:sellerId', (req, res) => payoutController.getSellerPayouts(req, res));

    return router;
}
