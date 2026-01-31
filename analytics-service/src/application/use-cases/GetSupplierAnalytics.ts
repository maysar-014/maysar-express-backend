import { SupplierAnalyticsRepository } from '../../infrastructure/repositories/SupplierAnalyticsRepository';

export class GetSupplierAnalytics {
    constructor(private repository: SupplierAnalyticsRepository) { }

    async execute(supplierId: string) {
        return this.repository.getAnalytics(supplierId);
    }
}
