import { SellerAnalyticsRepository } from '../../infrastructure/repositories/SellerAnalyticsRepository';
import { RevenueHealthEngine } from '../../domain/engines/RevenueHealthEngine';
import { RevenueHealthMetricsDTO } from '../dto/seller-profitability-dashboard.dto';

export class GetRevenueHealthMetrics {
    constructor(
        private repository: SellerAnalyticsRepository,
        private engine: RevenueHealthEngine
    ) {}

    async execute(timeWindow: 'weekly' | 'monthly' = 'monthly'): Promise<RevenueHealthMetricsDTO> {
        const revenueTrends = await this.repository.getSellerRevenueTrends(timeWindow);
        
        const sellerRevenues = revenueTrends.map(trend => 
            trend._sum.totalAmount ? Number(trend._sum.totalAmount) : 0
        );

        const metrics = this.engine.calculateMetrics(sellerRevenues, timeWindow);

        return {
            arpsWeekly: metrics.arpsWeekly,
            arpsMonthly: metrics.arpsMonthly,
            medianRevenue: metrics.medianRevenue,
            revenueDistributionTop20: metrics.revenueDistributionTop20
        };
    }
}
