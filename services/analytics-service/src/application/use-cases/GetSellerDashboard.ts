import { SellerAnalyticsRepository } from '../../infrastructure/repositories/SellerAnalyticsRepository';

export class GetSellerDashboard {
    constructor(private repository: SellerAnalyticsRepository) { }

    async execute(sellerId: string) {
        return this.repository.getMetrics(sellerId);
    }
}
