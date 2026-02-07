import { IEnablerOrderRepository } from '../../domain/repositories/enabler-order.repository.interface';
import { SettlementEngine } from '../../domain/engines/settlement.engine';
import { EnablerCommissionEntity } from '../../domain/entities/enabler-commission.entity';

export class SettleEnablerPaymentUseCase {
    constructor(
        private readonly orderRepository: IEnablerOrderRepository,
        private readonly payoutService: any,
        private readonly eventPublisher: any
    ) { }

    async execute(orderId: string): Promise<void> {
        const order = await this.orderRepository.findByOrderId(orderId);
        if (!order) throw new Error('Order not found');

        if (order.toPlainObject().status !== 'COMPLETED') {
            throw new Error('Order must be completed before settlement');
        }

        // 1. Calculate Settlement
        const settlement = SettlementEngine.calculateSettlement({
            orderAmount: order.orderAmount,
            commissionAmount: order.enablerCommission,
            platformFee: 0, // Should be fetched
            sellerId: order.sellerId,
            enablerId: order.enablerId
        });

        // 2. Initiate Payout via Service
        await this.payoutService.initiatePayout({
            recipientId: order.enablerId,
            amount: settlement.enablerPayout,
            scheduledDate: settlement.payoutDate,
            referenceId: order.id,
            type: 'COMMISSION'
        });

        // 3. Initiate Seller Payout (if not handled by another service)
        await this.payoutService.initiatePayout({
            recipientId: order.sellerId,
            amount: settlement.sellerPayout,
            scheduledDate: settlement.payoutDate, // Usually faster for sellers
            referenceId: order.id,
            type: 'SALE_PROCEED'
        });

        // 4. Update Order Status
        order.markEnablerPaid();
        order.markSellerPaid();
        await this.orderRepository.update(order);

        // 5. Emit Event
        // await this.eventPublisher.publish(new EnablerPaymentSettledEvent(...));
    }
}
