import { SellerAnalyticsRepository } from '../../infrastructure/repositories/SellerAnalyticsRepository';
import { FinancialMetricsEngine, PayoutTimingData, DisputeData } from '../../domain/engines/FinancialMetricsEngine';
import { FinancialMetricsDTO } from '../dto/seller-profitability-dashboard.dto';

export class GetFinancialMetrics {
    constructor(
        private repository: SellerAnalyticsRepository,
        private engine: FinancialMetricsEngine
    ) {}

    async execute(): Promise<FinancialMetricsDTO> {
        const payoutData = await this.repository.getPayoutTimingData();
        const disputeData = await this.repository.getCommissionDisputeData();
        const totalOrders = await this.repository.getTotalOrderCount();

        const payoutTimingData: PayoutTimingData[] = payoutData.map((payout: any) => ({
            payoutId: payout.id,
            createdAt: payout.createdAt,
            completedAt: payout.completedAt!
        }));

        const disputeDataFormatted: DisputeData[] = disputeData.map((dispute: any) => ({
            ticketId: dispute.id,
            category: dispute.category,
            status: dispute.status
        }));

        const metrics = this.engine.calculateMetrics(
            payoutTimingData,
            payoutTimingData,
            disputeDataFormatted,
            totalOrders
        );

        return {
            avgPayoutTimeHours: metrics.avgPayoutTimeHours,
            avgWithdrawalTimeHours: metrics.avgWithdrawalTimeHours,
            disputesPer100Orders: metrics.disputesPer100Orders
        };
    }
}
