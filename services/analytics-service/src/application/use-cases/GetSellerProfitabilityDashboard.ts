import { SellerAnalyticsRepository } from '../../infrastructure/repositories/SellerAnalyticsRepository';
import { GetRevenueHealthMetrics } from './GetRevenueHealthMetrics';
import { GetGrowthIndicators } from './GetGrowthIndicators';
import { GetRetentionMetrics } from './GetRetentionMetrics';
import { GetFinancialMetrics } from './GetFinancialMetrics';
import { GetHappinessSignals } from './GetHappinessSignals';
import { SellerProfitabilityDashboardDTO, QuickHealthCheckDTO, CoreMetricsDTO, DetailedAnalyticsDTO } from '../dto/seller-profitability-dashboard.dto';

export class GetSellerProfitabilityDashboard {
    constructor(
        private repository: SellerAnalyticsRepository,
        private revenueHealthUseCase: GetRevenueHealthMetrics,
        private growthIndicatorsUseCase: GetGrowthIndicators,
        private retentionMetricsUseCase: GetRetentionMetrics,
        private financialMetricsUseCase: GetFinancialMetrics,
        private happinessSignalsUseCase: GetHappinessSignals
    ) {}

    async execute(sellerId?: string): Promise<SellerProfitabilityDashboardDTO> {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const gmv = await this.repository.getGMV(thirtyDaysAgo, now);
        const activeSellers = await this.repository.getActiveSellersCount(30);
        const revenueHealthMetrics = await this.revenueHealthUseCase.execute('monthly');
        const growthIndicators = await this.growthIndicatorsUseCase.execute();
        const retentionMetrics = await this.retentionMetricsUseCase.execute();
        const financialMetrics = await this.financialMetricsUseCase.execute();
        const happinessSignals = await this.happinessSignalsUseCase.execute();

        const topRow: QuickHealthCheckDTO = {
            gmv: typeof gmv === 'object' ? gmv.toNumber() : gmv,
            activeSellers: activeSellers.length,
            arps: revenueHealthMetrics.arpsMonthly,
            repeatBuyerRate: growthIndicators.repeatBuyerRate
        };

        const secondRow: CoreMetricsDTO = {
            sellerRetentionPercent: retentionMetrics.retentionRate90Days,
            churnPercent: retentionMetrics.churnRateMonthly,
            medianRevenue: revenueHealthMetrics.medianRevenue,
            payoutTimeHours: financialMetrics.avgPayoutTimeHours
        };

        const thirdRow: DetailedAnalyticsDTO = {
            revenueDistribution: {
                top20Percent: revenueHealthMetrics.revenueDistributionTop20,
                restPercent: 100 - revenueHealthMetrics.revenueDistributionTop20
            },
            growthPerSeller: [],
            timeToFirstSale: retentionMetrics.avgTimeToFirstSaleDays,
            productVelocityHeatmap: []
        };

        return {
            topRow,
            secondRow,
            thirdRow,
            timestamp: now,
            sellerId
        };
    }
}
