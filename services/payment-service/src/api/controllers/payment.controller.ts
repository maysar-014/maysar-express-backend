/**
 * Payment Controller
 * Handles HTTP requests for payment operations
 */

import { Request, Response } from 'express';
import { ProcessPaymentUseCase } from '../../application/use-cases/process-payment.use-case';
import { CheckPaymentStatusUseCase } from '../../application/use-cases/check-payment-status.use-case';
import { RefundPaymentUseCase } from '../../application/use-cases/refund-payment.use-case';
import { HandlePesapalWebhookUseCase } from '../../application/use-cases/handle-pesapal-webhook.use-case';
import { PesapalAdapter } from '../../infrastructure/providers/pesapal.adapter';
import { WebhookPayload } from '../../domain/repositories/payment-provider.gateway';
import { logger } from '../../infrastructure/services/logger.service';
import { t } from '@shared/i18n/i18n';

export class PaymentController {
    constructor(
        private readonly processPaymentUseCase: ProcessPaymentUseCase,
        private readonly checkPaymentStatusUseCase: CheckPaymentStatusUseCase,
        private readonly refundPaymentUseCase: RefundPaymentUseCase,
        private readonly handlePesapalWebhookUseCase?: HandlePesapalWebhookUseCase,
        private readonly pesapalAdapter?: PesapalAdapter
    ) { }

    /**
     * POST /payments
     * Create a new payment
     */
    async createPayment(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.processPaymentUseCase.execute({
                orderId: req.body.orderId,
                userId: (req as any).user?.id || req.body.userId,
                amount: req.body.amount,
                currency: req.body.currency || 'TZS',
                method: req.body.method,
                customerInfo: {
                    email: req.body.customerEmail || (req as any).user?.email,
                    phoneNumber: req.body.phoneNumber,
                    name: req.body.customerName || (req as any).user?.name,
                    ipAddress: req.ip || '0.0.0.0',
                    deviceFingerprint: req.headers['x-device-fingerprint'] as string || 'unknown',
                },
                metadata: {
                    userAgent: req.headers['user-agent'],
                    callbackUrl: req.body.callbackUrl,
                    ...req.body.metadata,
                },
            });

            if (result.success) {
                res.status(201).json({
                    success: true,
                    data: {
                        paymentId: result.paymentId,
                        status: result.status,
                        redirectUrl: result.redirectUrl,
                        providerReference: result.providerReference,
                    },
                    message: result.message,
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.message,
                    data: {
                        paymentId: result.paymentId,
                        status: result.status,
                        fraudAssessment: result.fraudAssessment,
                    },
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: t('common:errors.internalServerError', { lng: (req as any).language }),
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * GET /payments/:id
     * Get payment by ID
     */
    async getPayment(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.checkPaymentStatusUseCase.execute({
                paymentId: req.params.id,
            });

            if (result) {
                res.status(200).json({
                    success: true,
                    data: result,
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: t('payment:errors.notFound', { lng: (req as any).language }),
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: t('common:errors.internalServerError', { lng: (req as any).language }),
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * GET /payments/order/:orderId
     * Get payment by order ID
     */
    async getPaymentByOrderId(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.checkPaymentStatusUseCase.execute({
                orderId: req.params.orderId,
            });

            if (result) {
                res.status(200).json({
                    success: true,
                    data: result,
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: t('payment:errors.notFound', { lng: (req as any).language }),
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: t('common:errors.internalServerError', { lng: (req as any).language }),
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * POST /payments/:id/refund
     * Refund a payment
     */
    async refundPayment(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.refundPaymentUseCase.execute({
                paymentId: req.params.id,
                amount: req.body.amount,
                reason: req.body.reason,
                reasonDetails: req.body.reasonDetails,
                requestedBy: (req as any).user?.id || 'system',
            });

            if (result.success) {
                res.status(200).json({
                    success: true,
                    data: {
                        refundId: result.refundId,
                        status: result.status,
                        refundAmount: result.refundAmount,
                    },
                    message: result.message,
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.message,
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: t('common:errors.internalServerError', { lng: (req as any).language }),
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * GET /payments/:id/status
     * Check payment status
     */
    async checkStatus(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.checkPaymentStatusUseCase.execute({
                paymentId: req.params.id,
            });

            if (result) {
                res.status(200).json({
                    success: true,
                    data: {
                        status: result.status,
                        amount: result.amount,
                        currency: result.currency,
                        completedAt: result.completedAt,
                        failureReason: result.failureReason,
                    },
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: t('payment:errors.notFound', { lng: (req as any).language }),
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: t('common:errors.internalServerError', { lng: (req as any).language }),
            });
        }
    }

    /**
     * POST /webhooks/pesapal
     * Handle Pesapal webhook notification
     */
    async handlePesapalWebhook(req: Request, res: Response): Promise<void> {
        try {
            if (!this.handlePesapalWebhookUseCase || !this.pesapalAdapter) {
                res.status(501).json({ error: t('payment:errors.webhookNotConfigured', { lng: (req as any).language }) });
                return;
            }

            const signature = (req.headers['verif-hash'] as string) || (req.headers['x-pesapal-signature'] as string);
            const rawPayload = Buffer.isBuffer(req.body)
                ? req.body.toString('utf8')
                : JSON.stringify(req.body ?? {});

            if (!signature || !this.pesapalAdapter.verifyWebhookSignature(rawPayload, signature)) {
                logger.warn('Invalid webhook signature', { signature });
                res.status(401).json({ error: t('payment:errors.invalidSignature', { lng: (req as any).language }) });
                return;
            }

            const parsedBody = Buffer.isBuffer(req.body)
                ? JSON.parse(rawPayload || '{}')
                : (req.body ?? {});
            const providerReference =
                parsedBody.OrderTrackingId ||
                parsedBody.orderTrackingId ||
                parsedBody.merchant_reference ||
                parsedBody.merchantReference ||
                parsedBody.tx_ref ||
                parsedBody?.data?.tx_ref ||
                parsedBody?.data?.order_tracking_id ||
                parsedBody?.data?.merchant_reference ||
                (req.query.OrderTrackingId as string | undefined);
            const providerTransactionId =
                parsedBody.id ||
                parsedBody?.data?.id ||
                parsedBody?.data?.tracking_id ||
                parsedBody?.data?.transaction_id ||
                providerReference;
            const paymentStatus =
                parsedBody.status ||
                parsedBody?.data?.status ||
                (req.query.Status as string | undefined) ||
                'UNKNOWN';

            if (!providerReference) {
                logger.warn('Missing webhook parameters', { body: parsedBody, query: req.query });
                res.status(400).json({ error: t('payment:errors.missingParameters', { lng: (req as any).language }) });
                return;
            }

            const webhookPayload: WebhookPayload = {
                eventType: 'payment.status.update',
                providerReference,
                status: paymentStatus,
                amount: 0,
                currency: 'TZS',
                timestamp: new Date(),
                metadata: {
                    transactionId: providerTransactionId,
                    rawBody: parsedBody,
                    rawQuery: req.query
                }
            };

            await this.pesapalAdapter.handleWebhook(webhookPayload);

            const result = await this.handlePesapalWebhookUseCase.execute(
                providerReference,
                String(providerTransactionId),
                paymentStatus,
                webhookPayload
            );

            logger.info('Webhook processed successfully', result);
            res.status(200).json({ status: 'OK' });
        } catch (error) {
            logger.error('Webhook processing failed', { error });
            res.status(500).json({ error: t('common:errors.internalServerError', { lng: (req as any).language }) });
        }
    }
}

