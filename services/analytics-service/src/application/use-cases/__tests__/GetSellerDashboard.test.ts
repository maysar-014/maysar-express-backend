import { GetSellerDashboard } from '../GetSellerDashboard';
import { SellerAnalyticsRepository } from '../../../infrastructure/repositories/SellerAnalyticsRepository';

describe('GetSellerDashboard', () => {
    let useCase: GetSellerDashboard;
    let repository: jest.Mocked<Pick<SellerAnalyticsRepository, 'getMetrics'>>;

    beforeEach(() => {
        repository = {
            getMetrics: jest.fn()
        };
        useCase = new GetSellerDashboard(repository as unknown as SellerAnalyticsRepository);
    });

    it('returns seller metrics when repository succeeds', async () => {
        const sellerId = 'seller-123';
        const mockMetrics = {
            sellerId,
            averageOrderValue: 150,
            conversionRate: 0.03,
            createdAt: new Date()
        };

        repository.getMetrics.mockResolvedValue(mockMetrics as never);

        const result = await useCase.execute(sellerId);

        expect(repository.getMetrics).toHaveBeenCalledWith(sellerId);
        expect(result).toEqual(mockMetrics);
    });

    it('throws an error when repository fails', async () => {
        const sellerId = 'seller-123';
        const error = new Error('Database error');
        repository.getMetrics.mockRejectedValue(error);

        await expect(useCase.execute(sellerId)).rejects.toThrow('Database error');
    });

    it('handles missing seller', async () => {
        repository.getMetrics.mockResolvedValue(null);
        const result = await useCase.execute('seller-999');
        expect(result).toBeNull();
    });
});
