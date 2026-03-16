import { IPaymentRepository } from '../../domain/repositories/payment.repository';
import { IPaymentProvider, WebhookPayload } from '../../domain/repositories/payment-provider.gateway';
import { IEventBus } from '@shared/events/eventBus';
import { logger } from '../../infrastructure/services/logger.service';
import { PaymentStatus } from '../../domain/entities/payment.entity';
import { WebhookEventRepository } from '../../infrastructure/repositories/webhook-event.repository';

interface HandleWebhookResult {
  handled: boolean;
  paymentId: string;
  status: string;
}

export class HandlePesapalWebhookUseCase {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly paymentProvider: IPaymentProvider,
    private readonly eventBus: IEventBus,
    private readonly webhookEvents?: WebhookEventRepository
  ) {}

  async execute(
    providerReference: string,
    providerTransactionReference: string,
    paymentStatus: string,
    webhookPayload: WebhookPayload
  ): Promise<HandleWebhookResult> {
    logger.info('Processing Pesapal webhook', { 
      providerReference, 
      providerTransactionReference, 
      paymentStatus,
      eventType: webhookPayload.eventType,
      timestamp: webhookPayload.timestamp
    });

    const webhookRecord = this.webhookEvents
      ? await this.webhookEvents.recordReceived({
          provider: this.paymentProvider.getProviderName?.() || 'unknown',
          eventType: webhookPayload.eventType,
          eventId: providerTransactionReference || providerReference,
          payload: {
            ...webhookPayload,
            providerReference,
            providerTransactionReference,
            paymentStatus
          }
        })
      : null;

    try {
      const payment = await this.paymentRepository.findByProviderReference(providerReference);
      if (!payment) {
        logger.warn('Payment not found for webhook', { providerReference });
        throw new Error(`Payment not found: ${providerReference}`);
      }

      if (payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.FAILED) {
        logger.info('Payment already in terminal state, skipping update', { 
          paymentId: payment.id, 
          currentStatus: payment.status 
        });
        if (webhookRecord) {
          await this.webhookEvents?.markProcessed(webhookRecord.id);
        }
        return {
          handled: true,
          paymentId: payment.id,
          status: payment.status
        };
      }

      const statusResponse = await this.paymentProvider.checkPaymentStatus(providerReference);

      if (statusResponse.status === 'COMPLETED') {
        payment.markAsCompleted();
        await this.paymentRepository.update(payment);
        await this.eventBus.publish('PaymentCompleted.v1', {
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
          currency: payment.currency,
          providerReference,
          completedAt: new Date().toISOString()
        }, { source: 'payment-service', correlationId: payment.id });
        logger.info('Payment marked as completed', { paymentId: payment.id });
      } else if (statusResponse.status === 'FAILED') {
        payment.markAsFailed(statusResponse.failureReason || 'Payment failed at provider');
        await this.paymentRepository.update(payment);
        await this.eventBus.publish('PaymentFailed.v1', {
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
          currency: payment.currency,
          providerReference,
          failureReason: payment.failureReason,
          failedAt: new Date().toISOString()
        }, { source: 'payment-service', correlationId: payment.id });
        logger.info('Payment marked as failed', { paymentId: payment.id });
      }

      if (webhookRecord) {
        await this.webhookEvents?.markProcessed(webhookRecord.id);
      }

      return {
        handled: true,
        paymentId: payment.id,
        status: statusResponse.status
      };
    } catch (error: any) {
      if (webhookRecord) {
        await this.webhookEvents?.markFailed(webhookRecord.id, error?.message || 'Webhook processing failed');
      }
      throw error;
    }
  }
}

