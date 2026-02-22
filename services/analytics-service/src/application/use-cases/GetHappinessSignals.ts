import { SellerAnalyticsRepository } from '../../infrastructure/repositories/SellerAnalyticsRepository';
import { SellerHappinessEngine, ProductExpansionData, ReferralData } from '../../domain/engines/SellerHappinessEngine';
import { HappinessSignalsDTO } from '../dto/seller-profitability-dashboard.dto';

export class GetHappinessSignals {
    constructor(
        private repository: SellerAnalyticsRepository,
        private engine: SellerHappinessEngine
    ) {}

    async execute(): Promise<HappinessSignalsDTO> {
        const productExpansionRawData = await this.repository.getProductExpansionData();
        const referralRawData = await this.repository.getReferralData();
        const sellerActivityData = await this.repository.getSellerActivityData(90);

        const sellerMap = new Map(sellerActivityData.map(s => [s.id, s.createdAt]));

        const productExpansionData: ProductExpansionData[] = Array.from(
            productExpansionRawData.reduce((map, product) => {
                const existing = map.get(product.sellerId) || {
                    sellerId: product.sellerId,
                    userCreatedAt: sellerMap.get(product.sellerId) || new Date(),
                    firstProductAddedAt: product.createdAt,
                    totalProductsAdded: 0
                };
                existing.totalProductsAdded++;
                return map.set(product.sellerId, existing);
            }, new Map()).values()
        );

        const referralDataFormatted: ReferralData[] = referralRawData.map(ref => ({
            referrerId: ref.referrerId,
            referralId: ref.id,
            status: ref.status
        }));

        const metrics = this.engine.calculateMetrics(
            productExpansionData,
            referralDataFormatted
        );

        return {
            productExpansionRate: metrics.productExpansionRate,
            referralCount: metrics.referralCount
        };
    }
}
