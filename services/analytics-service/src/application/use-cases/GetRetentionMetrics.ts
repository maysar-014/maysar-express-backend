import { SellerAnalyticsRepository } from '../../infrastructure/repositories/SellerAnalyticsRepository';
import { RetentionEngine, SellerActivityData, SellerChurnData, TimeToFirstSaleData } from '../../domain/engines/RetentionEngine';
import { RetentionMetricsDTO } from '../dto/seller-profitability-dashboard.dto';

export class GetRetentionMetrics {
    constructor(
        private repository: SellerAnalyticsRepository,
        private engine: RetentionEngine
    ) {}

    async execute(): Promise<RetentionMetricsDTO> {
        const sellerActivityData = await this.repository.getSellerActivityData(90);
        
        const sellerActivityDataFormatted: SellerActivityData[] = sellerActivityData.map(seller => ({
            sellerId: seller.id,
            createdAt: seller.createdAt,
            lastOrderAt: null,
            lastProductListedAt: null,
            isActive: false
        }));

        const churnData: SellerChurnData[] = sellerActivityData.map(seller => ({
            sellerId: seller.id,
            wasActivePreviousMonth: false,
            isActiveCurrentMonth: false
        }));

        const timeToFirstSaleData: TimeToFirstSaleData[] = sellerActivityData.map(seller => ({
            sellerId: seller.id,
            userCreatedAt: seller.createdAt,
            firstOrderAt: null
        }));

        const metrics = this.engine.calculateMetrics(
            sellerActivityDataFormatted,
            churnData,
            timeToFirstSaleData
        );

        return {
            retentionRate90Days: metrics.retentionRate90Days,
            churnRateMonthly: metrics.churnRateMonthly,
            avgTimeToFirstSaleDays: metrics.avgTimeToFirstSaleDays
        };
    }
}
