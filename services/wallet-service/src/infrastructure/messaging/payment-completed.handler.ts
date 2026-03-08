import { CreditWalletUseCase } from '../../application/use-cases/credit-wallet.use-case';
import { AuditInfo, ActorType } from '../../domain/value-objects/audit-info.value-object';
import { EventEnvelope } from '@shared-events/eventBus';
import { EventIdempotency } from '@shared/middleware/idempotency';

interface PaymentCompletedEvent {
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    paymentId: string;
}

export class PaymentCompletedHandler {
    constructor(
        private readonly creditWalletUseCase: CreditWalletUseCase,
        private readonly eventIdempotency: EventIdempotency
    ) { }

    async handle(event: EventEnvelope): Promise<void> {
        const { data } = event;
        if (!this.isPaymentCompletedEvent(data)) {
            return;
        }

        // Check if this payment is for a wallet top-up
        if (!data.orderId || !data.orderId.startsWith('TOPUP_')) {
            console.log(`[PaymentCompletedHandler] Skipping non-top-up payment: ${data.orderId}`);
            return;
        }

        await this.eventIdempotency.withIdempotency(
            data.paymentId,
            'PaymentCompletedHandler',
            async () => {
                console.log(`[PaymentCompletedHandler] Processing top-up for user ${data.userId}, amount ${data.amount}`);

                try {
                    await this.creditWalletUseCase.execute({
                        userId: data.userId,
                        amount: data.amount,
                        currency: data.currency,
                        description: `Wallet top-up via ${data.orderId}`,
                        idempotencyKey: `topup_${data.paymentId}`, // Use paymentId for idempotency
                        correlationId: data.paymentId,
                        auditInfo: new AuditInfo({
                            actor: 'system',
                            actorType: ActorType.SYSTEM,
                            action: 'WALLET_TOPUP',
                            reason: `Payment ${data.paymentId} completed`,
                            timestamp: new Date()
                        })
                    });
                    console.log(`[PaymentCompletedHandler] Wallet successfully credited for user ${data.userId}`);
                } catch (error) {
                    console.error(`[PaymentCompletedHandler] Failed to credit wallet for user ${data.userId}:`, error);
                    // In production, this would be retried or moved to a dead letter queue
                }
            }
        );
    }

    private isPaymentCompletedEvent(data: unknown): data is PaymentCompletedEvent {
        if (typeof data !== 'object' || data === null) {
            return false;
        }

        const eventData = data as Partial<PaymentCompletedEvent>;
        return typeof eventData.orderId === 'string'
            && typeof eventData.userId === 'string'
            && typeof eventData.amount === 'number'
            && typeof eventData.currency === 'string'
            && typeof eventData.paymentId === 'string';
    }
}
