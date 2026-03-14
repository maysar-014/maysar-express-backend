import { Request, Response } from 'express';
import { PesapalAdapter } from '../../infrastructure/providers/pesapal.adapter';
import { HandlePesapalWebhookUseCase } from '../../application/use-cases/handle-pesapal-webhook.use-case';
import { WebhookPayload } from '../../domain/repositories/payment-provider.gateway';
import { logger } from '../../infrastructure/services/logger.service';

export class WebhookController {
  constructor(
    private readonly pesapalAdapter: PesapalAdapter,
    private readonly handlePesapalWebhookUseCase: HandlePesapalWebhookUseCase
  ) {}

  async handlePesapalWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature =
        (req.headers['verif-hash'] as string) ||
        (req.headers['x-pesapal-signature'] as string);
      const rawPayload = Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : JSON.stringify(req.body ?? {});

      if (!signature || !this.pesapalAdapter.verifyWebhookSignature(rawPayload, signature)) {
        logger.warn('Invalid webhook signature', { signature });
        res.status(401).json({ error: 'Invalid signature' });
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
        res.status(400).json({ error: 'Missing required parameters' });
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
          merchantReference: providerTransactionId,
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
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

