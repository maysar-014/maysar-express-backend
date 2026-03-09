import { GetSupplierAnalytics } from '../GetSupplierAnalytics';
import { SupplierAnalyticsRepository } from '../../../infrastructure/repositories/SupplierAnalyticsRepository';

describe('GetSupplierAnalytics', () => {
    let useCase: GetSupplierAnalytics;
    let repository: jest.Mocked<Pick<SupplierAnalyticsRepository, 'getAnalytics'>>;

    beforeEach(() => {
        repository = {
            getAnalytics: jest.fn()
        };
        useCase = new GetSupplierAnalytics(repository as unknown as SupplierAnalyticsRepository);
    });

    it('returns supplier analytics from repository', async () => {
        const supplierId = 'sup-001';
        const mockResult = { supplierId, qualityScore: 95 };

        repository.getAnalytics.mockResolvedValue(mockResult as never);

        const result = await useCase.execute(supplierId);

        expect(repository.getAnalytics).toHaveBeenCalledWith(supplierId);
        expect(result).toBe(mockResult);
    });

    it('returns null when supplier is missing', async () => {
        repository.getAnalytics.mockResolvedValue(null);
        const result = await useCase.execute('sup-999');
        expect(result).toBeNull();
    });

    it('propagates repository errors', async () => {
        repository.getAnalytics.mockRejectedValue(new Error('Connection failed'));
        await expect(useCase.execute('sup-001')).rejects.toThrow('Connection failed');
    });
});
