import { SettleEnablerPaymentUseCase } from '../use-cases/settle-enabler-payment.use-case';
import { IEnablerOrderRepository } from '../../domain/repositories/enabler-order.repository.interface';

export class CommissionSettlementSaga {
    constructor(
        private readonly settlePaymentUseCase: SettleEnablerPaymentUseCase,
        private readonly orderRepository: IEnablerOrderRepository,
        private readonly notificationService: any
    ) { }

    async execute(orderId: string): Promise<void> {
        try {
            // 1. Trigger Settlement Calculation & Payout Initiation
            await this.settlePaymentUseCase.execute(orderId);

            // 2. Notify Enabler
            const order = await this.orderRepository.findByOrderId(orderId);
            if (!order) {
                throw new Error('Order not found for commission notification');
            }
            await this.notificationService.sendCommissionPaidNotification(
                order.enablerId,
                order.enablerCommission
            );

        } catch (error) {
            console.error('Commission Settlement Failed:', error);
            // Retry logic or manual intervention flag
        }
    }
}
