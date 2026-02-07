import { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import { IEnablerOrderRepository } from '../../domain/repositories/enabler-order.repository.interface';
import { CommissionCalculationEngine } from '../../domain/engines/commission-calculation.engine';
import { CommissionBreakdownDto } from '../dto/enabler-order.dto';

export class CalculateEnablerCommissionUseCase {
    constructor(
        private readonly enablerRepository: IEnablerRepository,
        private readonly orderRepository: IEnablerOrderRepository
    ) { }

    async execute(orderId: string): Promise<CommissionBreakdownDto> {
        const order = await this.orderRepository.findByOrderId(orderId);
        if (!order) throw new Error('Order not found');

        const enabler = await this.enablerRepository.findById(order.enablerId);
        if (!enabler) throw new Error('Enabler not found');

        // Calculate detailed breakdown
        const breakdown = CommissionCalculationEngine.calculate({
            orderAmount: order.orderAmount,
            enablerTier: enabler.tier,
            baseCommissionRate: enabler.commissionRate,
            performanceMetrics: {
                conversionRate: enabler.conversionRate,
                customerRating: enabler.toPlainObject().customerRating || 0,
                totalOrders: enabler.totalOrders,
                disputeRate: 0 // Fetch real dispute rate
            }
        });

        return {
            baseCommission: breakdown.baseCommission,
            tierBonus: breakdown.tierBonus,
            performanceBonus: breakdown.performanceBonus,
            totalCommission: breakdown.totalCommission,
            commissionRate: breakdown.commissionRate
        };
    }
}
