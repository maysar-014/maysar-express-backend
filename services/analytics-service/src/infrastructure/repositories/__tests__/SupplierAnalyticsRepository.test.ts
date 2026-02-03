import { SupplierAnalyticsRepository } from '../SupplierAnalyticsRepository';

describe('SupplierAnalyticsRepository Integration', () => {
    let repository: SupplierAnalyticsRepository;

    beforeEach(() => {
        repository = new SupplierAnalyticsRepository();
    });

    it('should exist', () => {
        expect(repository).toBeDefined();
    });
});
