import { IPaymentRepository } from '../../domain/repositories/payment.repository';
import { IPaymentProvider, WebhookPayload } from '../../domain/repositories/payment-provider.gateway';
import { IEventBus } from '@shared/events/eventBus';
import { logger } from '../../infrastructure/services/logger.service';
import { PaymentStatus } from '../../domain/entities/payment.entity';
import { WebhookEventRepository } from '../../infrastructure/repositories/webhook-event.repository';
import { OptimisticLockError } from '@shared/errors/optimistic-lock.error';

interface HandleWebhookResult {
  handled: boolean;
  paymentId: string;
  status: string;
}

interface WebhookRecordRef {
  id: string;
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
    const normalizedProviderTransactionReference =
      typeof providerTransactionReference === 'string' && providerTransactionReference.trim().length > 0
        ? providerTransactionReference.trim()
        : providerReference;

    logger.info('Processing Pesapal webhook', { 
      providerReference, 
      providerTransactionReference: normalizedProviderTransactionReference,
      paymentStatus,
      eventType: webhookPayload.eventType,
      timestamp: webhookPayload.timestamp
    });

    const webhookRecord = await this.recordWebhookEventSafely(
      normalizedProviderTransactionReference,
      providerReference,
      paymentStatus,
      webhookPayload
    );

    try {
      const payment = await this.findPayment(providerReference);
      if (!payment) {
        logger.warn('Payment not found for webhook', { providerReference });
        await this.markWebhookProcessedSafely(webhookRecord);
        return {
          handled: false,
          paymentId: providerReference,
          status: 'IGNORED'
        };
      }

      if (this.isTerminalStatus(payment.status)) {
        logger.info('Payment already in terminal state, skipping update', { 
          paymentId: payment.id, 
          currentStatus: payment.status 
        });
        await this.markWebhookProcessedSafely(webhookRecord);
        return {
          handled: true,
          paymentId: payment.id,
          status: payment.status
        };
      }

      const statusResponse = await this.resolvePaymentStatus(
        payment.id,
        payment.amount,
        payment.currency,
        providerReference,
        paymentStatus,
        webhookPayload
      );

      if (statusResponse.status === 'COMPLETED') {
        this.markPaymentCompleted(payment, normalizedProviderTransactionReference);
        const updateApplied = await this.tryUpdatePayment(payment);
        if (!updateApplied) {
          await this.markWebhookProcessedSafely(webhookRecord);
          return {
            handled: true,
            paymentId: payment.id,
            status: PaymentStatus.COMPLETED
          };
        }
        await this.publishWebhookEventSafely('PaymentCompleted.v1', {
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
        const updateApplied = await this.tryUpdatePayment(payment);
        if (!updateApplied) {
          await this.markWebhookProcessedSafely(webhookRecord);
          return {
            handled: true,
            paymentId: payment.id,
            status: PaymentStatus.FAILED
          };
        }
        await this.publishWebhookEventSafely('PaymentFailed.v1', {
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

      await this.markWebhookProcessedSafely(webhookRecord);

      return {
        handled: true,
        paymentId: payment.id,
        status: statusResponse.status
      };
    } catch (error: any) {
      await this.markWebhookFailedSafely(webhookRecord, error?.message || 'Webhook processing failed');
      throw error;
    }
  }

  private async findPayment(providerReference: string) {
    const paymentByProviderReference = await this.paymentRepository.findByProviderReference(providerReference);
    if (paymentByProviderReference) {
      return paymentByProviderReference;
    }

    if (typeof this.paymentRepository.findById === 'function') {
      return this.paymentRepository.findById(providerReference);
    }

    return null;
  }

  private async tryUpdatePayment(payment: { id: string; status: PaymentStatus; markAsFailed?: unknown }): Promise<boolean> {
    try {
      await this.paymentRepository.update(payment as never);
      return true;
    } catch (error) {
      if (!(error instanceof OptimisticLockError)) {
        throw error;
      }

      const latestPayment = await this.paymentRepository.findById(payment.id);
      if (!latestPayment) {
        throw error;
      }

      if (latestPayment.status === PaymentStatus.COMPLETED || latestPayment.status === PaymentStatus.FAILED) {
        logger.info('Webhook update already applied by another request', {
          paymentId: latestPayment.id,
          status: latestPayment.status
        });
        return false;
      }

      throw error;
    }
  }

  private async publishWebhookEventSafely(eventName: string, payload: Record<string, unknown>, metadata: Record<string, unknown>): Promise<void> {
    try {
      await this.eventBus.publish(eventName, payload, metadata);
    } catch (error) {
      logger.error('Failed to publish webhook follow-up event', {
        eventName,
        paymentId: payload.paymentId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async recordWebhookEventSafely(
    normalizedProviderTransactionReference: string,
    providerReference: string,
    paymentStatus: string,
    webhookPayload: WebhookPayload
  ): Promise<WebhookRecordRef | null> {
    if (!this.webhookEvents) {
      return null;
    }

    try {
      return await this.webhookEvents.recordReceived({
        provider: this.paymentProvider.getProviderName?.() || 'unknown',
        eventType: webhookPayload.eventType,
        eventId: normalizedProviderTransactionReference,
        payload: {
          ...webhookPayload,
          providerReference,
          providerTransactionReference: normalizedProviderTransactionReference,
          paymentStatus
        }
      });
    } catch (error) {
      logger.warn('Failed to persist webhook receipt; continuing with webhook processing', {
        providerReference,
        providerTransactionReference: normalizedProviderTransactionReference,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private async markWebhookProcessedSafely(webhookRecord: WebhookRecordRef | null): Promise<void> {
    if (!webhookRecord || !this.webhookEvents) {
      return;
    }

    try {
      await this.webhookEvents.markProcessed(webhookRecord.id);
    } catch (error) {
      logger.warn('Failed to mark webhook receipt as processed', {
        webhookRecordId: webhookRecord.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async markWebhookFailedSafely(webhookRecord: WebhookRecordRef | null, message: string): Promise<void> {
    if (!webhookRecord || !this.webhookEvents) {
      return;
    }

    try {
      await this.webhookEvents.markFailed(webhookRecord.id, message);
    } catch (error) {
      logger.warn('Failed to mark webhook receipt as failed', {
        webhookRecordId: webhookRecord.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async resolvePaymentStatus(
    paymentId: string,
    amount: number,
    currency: string,
    providerReference: string,
    webhookStatus: string,
    webhookPayload: WebhookPayload
  ) {
    const isContractTest = webhookPayload.metadata?.contractTest === true && process.env.NODE_ENV !== 'production';

    if (!isContractTest) {
      return this.paymentProvider.checkPaymentStatus(providerReference);
    }

    const normalizedStatus = this.normalizeIncomingStatus(webhookStatus);
    return {
      paymentId,
      providerReference,
      status: normalizedStatus,
      amount,
      currency,
      completedAt: normalizedStatus === 'COMPLETED' ? new Date() : undefined,
      failureReason: normalizedStatus === 'FAILED' ? 'Payment failed during contract verification' : undefined
    };
  }

  private normalizeIncomingStatus(status: string): string {
    const value = String(status || '').toUpperCase();

    if (value.includes('SUCCESS') || value.includes('COMPLETED') || value.includes('PAID')) return 'COMPLETED';
    if (value.includes('FAIL') || value.includes('ERROR')) return 'FAILED';
    if (value.includes('CANCEL')) return 'CANCELLED';
    if (value.includes('PENDING') || value.includes('PROCESS')) return 'PROCESSING';

    return 'PROCESSING';
  }

  private markPaymentCompleted(
    payment: { status: PaymentStatus; updateStatus: (status: PaymentStatus) => void; markAsCompleted: (providerTransactionId?: string) => void },
    providerTransactionReference?: string
  ): void {
    if (payment.status === PaymentStatus.PENDING) {
      payment.updateStatus(PaymentStatus.PROCESSING);
    }

    payment.markAsCompleted(providerTransactionReference);
  }

  private isTerminalStatus(status: PaymentStatus): boolean {
    return [
      PaymentStatus.COMPLETED,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
      PaymentStatus.REFUNDED,
      PaymentStatus.PARTIALLY_REFUNDED
    ].includes(status);
  }
}

