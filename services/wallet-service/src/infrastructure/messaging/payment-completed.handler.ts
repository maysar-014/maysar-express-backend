import { CreditWalletUseCase } from '../../application/use-cases/credit-wallet.use-case';
import { AuditInfo, ActorType } from '../../domain/value-objects/audit-info.value-object';
import { EventEnvelope } from '../../../../shared-contracts/types';

interface PaymentCompletedEvent {
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    paymentId: string;
}

export class PaymentCompletedHandler {
    constructor(
        private readonly creditWalletUseCase: CreditWalletUseCase
    ) { }

    async handle(event: EventEnvelope<PaymentCompletedEvent>): Promise<void> {
        const { payload } = event;

        // Check if this payment is for a wallet top-up
        if (!payload.orderId || !payload.orderId.startsWith('TOPUP_')) {
            console.log(`[PaymentCompletedHandler] Skipping non-top-up payment: ${payload.orderId}`);
            return;
        }

        console.log(`[PaymentCompletedHandler] Processing top-up for user ${payload.userId}, amount ${payload.amount}`);

        try {
            await this.creditWalletUseCase.execute({
                userId: payload.userId,
                amount: payload.amount,
                currency: payload.currency,
                description: `Wallet top-up via ${payload.orderId}`,
                idempotencyKey: `topup_${payload.paymentId}`, // Use paymentId for idempotency
                correlationId: payload.paymentId,
                auditInfo: new AuditInfo({
                    actor: 'system',
                    actorType: ActorType.SYSTEM,
                    action: 'WALLET_TOPUP',
                    reason: `Payment ${payload.paymentId} completed`,
                    timestamp: new Date()
                })
            });
            console.log(`[PaymentCompletedHandler] Wallet successfully credited for user ${payload.userId}`);
        } catch (error) {
            console.error(`[PaymentCompletedHandler] Failed to credit wallet for user ${payload.userId}:`, error);
            // In production, this would be retried or moved to a dead letter queue
        }
    }
}
