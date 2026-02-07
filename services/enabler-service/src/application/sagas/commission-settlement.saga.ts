import { SettleEnablerPaymentUseCase } from '../use-cases/settle-enabler-payment.use-case';

export class CommissionSettlementSaga {
    constructor(
        private readonly settlePaymentUseCase: SettleEnablerPaymentUseCase,
        private readonly notificationService: any
    ) { }

    async execute(orderId: string): Promise<void> {
        try {
            // 1. Trigger Settlement Calculation & Payout Initiation
            await this.settlePaymentUseCase.execute(orderId);

            // 2. Notify Enabler
            const order = { enablerId: 'mock-id', commission: 100 }; // Fetch real order
            await this.notificationService.sendCommissionPaidNotification(
                order.enablerId,
                order.commission
            );

        } catch (error) {
            console.error('Commission Settlement Failed:', error);
            // Retry logic or manual intervention flag
        }
    }
}
