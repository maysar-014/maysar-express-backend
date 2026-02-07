import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { Payment, PaymentStatus, PaymentMethod } from '../../domain/entities/payment.entity';
import { PesapalAdapter } from '../../infrastructure/providers/pesapal.adapter';

export interface PaymentSagaPayload {
  payment: Payment;
}

export class PaymentSaga extends DistributedSagaOrchestrator<PaymentSagaPayload> {
  protected sagaType = 'PaymentSaga';

  constructor(private pesapalAdapter: PesapalAdapter) {
    super(sagaLogRepository, 'order-service');
  }

  protected async onStart(sagaId: string, payload: PaymentSagaPayload): Promise<void> {
    // Initial state update if needed
  }

  protected defineSteps(): SagaStep<PaymentSagaPayload>[] {
    return [
      {
        name: 'FraudCheck',
        execute: async (payload, sagaId) => {
          const { payment } = payload;

          // Skip fraud check for COD
          if (payment.method === PaymentMethod.COD) {
            return;
          }

          const fraudResult = await this.performFraudCheck(payment);
          if (!fraudResult.approved) {
            payment.updateStatus(PaymentStatus.FAILED);
            throw new Error(`Fraud check failed: ${fraudResult.reason}`);
          }
        },
        compensate: async () => {
          // No action needed for fraud check compensation
        }
      },
      {
        name: 'ProcessPayment',
        execute: async (payload, sagaId) => {
          const { payment } = payload;

          if (payment.method === PaymentMethod.COD) {
            payment.updateStatus(PaymentStatus.COMPLETED);
            return;
          }

          payment.updateStatus(PaymentStatus.PROCESSING);

          let processingResult;
          switch (payment.method) {
            case PaymentMethod.CARD:
            case PaymentMethod.MOBILE_MONEY:
              processingResult = await this.processPesapalPayment(payment);
              break;
            case PaymentMethod.WALLET:
              processingResult = await this.processWalletPayment(payment);
              break;
            default:
              throw new Error(`Unsupported payment method: ${payment.method}`);
          }

          if (processingResult.success) {
            payment.updateStatus(PaymentStatus.COMPLETED, processingResult.transactionId);
          } else {
            payment.updateStatus(PaymentStatus.FAILED);
            throw new Error(`Payment processing failed: ${processingResult.error}`);
          }
        },
        compensate: async (payload, sagaId) => {
          const { payment } = payload;
          if (payment.status === PaymentStatus.COMPLETED) {
            // Implement refund logic if needed
            await this.publishCommand('PaymentRefund.Command', {
              paymentId: payment.id,
              orderId: payment.orderId,
              amount: payment.amount
            }, sagaId);
          }
        }
      }
    ];
  }

  private async performFraudCheck(payment: Payment): Promise<{ approved: boolean; reason?: string }> {
    if (payment.amount > 1000000) {
      return { approved: false, reason: 'Amount exceeds fraud threshold' };
    }
    return { approved: true };
  }

  private async processPesapalPayment(payment: Payment): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    const paymentRequest = {
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      buyerId: payment.buyerId,
      buyerEmail: 'customer@example.com',
      buyerPhone: '+255700000000',
      description: `Payment for order ${payment.orderId}`
    };
    return await this.pesapalAdapter.processPayment(paymentRequest);
  }

  private async processWalletPayment(payment: Payment): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    // Implementation logic for wallet payment
    return { success: true, transactionId: `WLT_${Date.now()}` };
  }
}
