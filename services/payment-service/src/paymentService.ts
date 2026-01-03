import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from '../../../shared/outbox/outboxPattern';
import { EventEnvelope, PaymentSucceededPayload, PaymentFailedPayload, EventFactory } from '../../../events';
import { randomUUID } from 'crypto';

export class PaymentService {
  private outbox: TransactionalOutbox;

  constructor(private prisma: PrismaClient) {
    this.outbox = new TransactionalOutbox(prisma);
  }

  async processPayment(paymentData: {
    orderId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    paymentDetails: any;
  }): Promise<{ paymentId: string; status: 'success' | 'failed' }> {
    const paymentId = randomUUID();

    return await this.prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          id: paymentId,
          orderId: paymentData.orderId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          paymentMethod: paymentData.paymentMethod,
          status: 'processing',
          paymentDetails: paymentData.paymentDetails
        }
      });

      // Simulate payment processing
      const isSuccess = Math.random() > 0.1; // 90% success rate

      if (isSuccess) {
        // Update payment status
        await tx.payment.update({
          where: { id: paymentId },
          data: { 
            status: 'completed',
            transactionId: `TXN-${Date.now()}`
          }
        });

        // Create success event
        const eventPayload = EventFactory.createPaymentSucceeded({
          paymentId,
          orderId: paymentData.orderId,
          amount: paymentData.amount,
          currency: paymentData.currency as 'TZS' | 'USD' | 'EUR',
          paymentMethod: paymentData.paymentMethod as 'card' | 'mobile_money' | 'bank_transfer',
          transactionId: `TXN-${Date.now()}`
        });

        const envelope: EventEnvelope<PaymentSucceededPayload> = {
          eventId: randomUUID(),
          eventType: 'payment.succeeded.v1',
          timestamp: new Date().toISOString(),
          correlationId: randomUUID(),
          producer: 'payment-service',
          version: 'v1',
          payload: eventPayload
        };

        await this.outbox.saveEvent(envelope, tx);
        return { paymentId, status: 'success' as const };

      } else {
        // Update payment status
        await tx.payment.update({
          where: { id: paymentId },
          data: { 
            status: 'failed',
            errorMessage: 'Payment processing failed'
          }
        });

        // Create failure event
        const eventPayload: PaymentFailedPayload = {
          version: 'v1',
          paymentId,
          orderId: paymentData.orderId,
          amount: paymentData.amount,
          currency: paymentData.currency as 'TZS' | 'USD' | 'EUR',
          reason: 'system_error',
          errorCode: 'PROC_FAILED'
        };

        const envelope: EventEnvelope<PaymentFailedPayload> = {
          eventId: randomUUID(),
          eventType: 'payment.failed.v1',
          timestamp: new Date().toISOString(),
          correlationId: randomUUID(),
          producer: 'payment-service',
          version: 'v1',
          payload: eventPayload
        };

        await this.outbox.saveEvent(envelope, tx);
        return { paymentId, status: 'failed' as const };
      }
    });
  }
}