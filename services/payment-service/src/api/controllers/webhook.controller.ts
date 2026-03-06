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

  async handlePesapalIpn(req: Request, res: Response): Promise<void> {
    try {
      const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
      const signature = req.headers['x-pesapal-signature'] as string;

      if (!signature || !this.pesapalAdapter.verifyWebhookSignature(queryString, signature)) {
        logger.warn('Invalid webhook signature', { signature });
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const { OrderTrackingId, OrderMerchantReference, Status } = req.query;

      if (!OrderTrackingId || !OrderMerchantReference) {
        logger.warn('Missing webhook parameters', { query: req.query });
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      const webhookPayload: WebhookPayload = {
        eventType: 'payment.status.update',
        providerReference: OrderTrackingId as string,
        status: Status as string || 'UNKNOWN',
        amount: 0,
        currency: 'TZS',
        timestamp: new Date(),
        metadata: {
          merchantReference: OrderMerchantReference as string,
          rawQuery: req.query
        }
      };

      await this.pesapalAdapter.handleWebhook(webhookPayload);

      const result = await this.handlePesapalWebhookUseCase.execute(
        OrderTrackingId as string,
        OrderMerchantReference as string,
        Status as string || 'UNKNOWN',
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
