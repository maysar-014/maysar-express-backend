import { SellerAnalyticsRepository } from '../../infrastructure/repositories/SellerAnalyticsRepository';
import { GrowthIndicatorsEngine, SellerGrowthData, ProductVelocityData, BuyerRetentionData } from '../../domain/engines/GrowthIndicatorsEngine';
import { GrowthIndicatorsDTO } from '../dto/seller-profitability-dashboard.dto';

export class GetGrowthIndicators {
    constructor(
        private repository: SellerAnalyticsRepository,
        private engine: GrowthIndicatorsEngine
    ) {}

    async execute(): Promise<GrowthIndicatorsDTO> {
        const revenueTrends = await this.repository.getSellerRevenueTrends('monthly');
        const productVelocity = await this.repository.getProductVelocityData();
        const buyerRetention = await this.repository.getBuyerRetentionData();

        const sellerGrowthData: SellerGrowthData[] = revenueTrends.map(trend => ({
            sellerId: trend.sellerId,
            currentMonthRevenue: trend._sum.totalAmount ? Number(trend._sum.totalAmount) : 0,
            previousMonthRevenue: 0 // Would need historical data for accurate calculation
        }));

        const productVelocityData: ProductVelocityData[] = productVelocity.map(pv => ({
            productId: pv.productId,
            totalQuantitySold: pv._sum.quantity || 0,
            daysSinceLaunch: 30 // Placeholder
        }));

        const buyerRetentionData: BuyerRetentionData[] = buyerRetention.map(br => ({
            buyerId: br.buyerId,
            orderCount: br._count.id
        }));

        const metrics = this.engine.calculateMetrics(
            sellerGrowthData,
            productVelocityData,
            buyerRetentionData
        );

        return {
            revenueGrowthMoM: metrics.revenueGrowthMoM,
            productVelocityAvg: metrics.productVelocityAvg,
            repeatBuyerRate: metrics.repeatBuyerRate
        };
    }
}
