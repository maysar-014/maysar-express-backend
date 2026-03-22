import { Request, Response } from 'express';
import { PesapalAdapter } from '../../infrastructure/providers/pesapal.adapter';
import { HandlePesapalWebhookUseCase } from '../../application/use-cases/handle-pesapal-webhook.use-case';
import { WebhookPayload } from '../../domain/repositories/payment-provider.gateway';
import { logger } from '../../infrastructure/services/logger.service';
import { extractPesapalWebhookRequest } from './pesapal-webhook.utils';

export class WebhookController {
  constructor(
    private readonly pesapalAdapter: PesapalAdapter,
    private readonly handlePesapalWebhookUseCase: HandlePesapalWebhookUseCase
  ) {}

  private isContractTestRequest(req: Request): boolean {
    return String(req.headers?.['x-contract-test'] || '').trim() === '1' && process.env.NODE_ENV !== 'production';
  }

  async handlePesapalWebhook(req: Request, res: Response): Promise<void> {
    try {
      const {
        parsedBody,
        providerReference,
        providerTransactionId,
        paymentStatus,
        merchantReference,
        notificationType,
      } = extractPesapalWebhookRequest(req);

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
          merchantReference,
          notificationType,
          contractTest: this.isContractTestRequest(req),
          rawBody: parsedBody,
          rawQuery: req.query
        }
      };

      await this.pesapalAdapter.handleWebhook(webhookPayload);

      const result = await this.handlePesapalWebhookUseCase.execute(
        providerReference,
        providerTransactionId ?? providerReference,
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

