import { SellerAnalyticsRepository } from '../../infrastructure/repositories/SellerAnalyticsRepository';

export class GetSalesAnalytics {
    constructor(private repository: SellerAnalyticsRepository) { }

    async execute(sellerId: string) {
        return this.repository.getSalesData(sellerId);
    }
}
