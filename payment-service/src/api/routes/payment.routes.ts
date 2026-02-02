/**
 * Payment Routes
 * Defines HTTP routes for payment operations
 */

import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';

export function createPaymentRoutes(paymentController: PaymentController): Router {
    const router = Router();

    // Create payment
    router.post('/', (req, res) => paymentController.createPayment(req, res));

    // Get payment by ID
    router.get('/:id', (req, res) => paymentController.getPayment(req, res));

    // Get payment by order ID
    router.get('/order/:orderId', (req, res) => paymentController.getPaymentByOrderId(req, res));

    // Check payment status
    router.get('/:id/status', (req, res) => paymentController.checkStatus(req, res));

    // Refund payment
    router.post('/:id/refund', (req, res) => paymentController.refundPayment(req, res));

    return router;
}
