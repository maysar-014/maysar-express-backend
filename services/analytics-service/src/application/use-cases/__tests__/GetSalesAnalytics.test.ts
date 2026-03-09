import { GetSalesAnalytics } from '../GetSalesAnalytics';
import { SellerAnalyticsRepository } from '../../../infrastructure/repositories/SellerAnalyticsRepository';

describe('GetSalesAnalytics', () => {
    let useCase: GetSalesAnalytics;
    let repository: jest.Mocked<Pick<SellerAnalyticsRepository, 'getSalesData'>>;

    beforeEach(() => {
        repository = {
            getSalesData: jest.fn()
        };
        useCase = new GetSalesAnalytics(repository as unknown as SellerAnalyticsRepository);
    });

    it('returns sales data when found', async () => {
        const sellerId = 'seller-123';
        const mockData = [
            { date: new Date(), revenue: 100, orders: 5 }
        ];

        repository.getSalesData.mockResolvedValue(mockData as never);

        const result = await useCase.execute(sellerId);

        expect(repository.getSalesData).toHaveBeenCalledWith(sellerId);
        expect(result).toBe(mockData);
    });

    it('propagates errors from repository', async () => {
        const sellerId = 'seller-123';
        repository.getSalesData.mockRejectedValue(new Error('Fetch failed'));

        await expect(useCase.execute(sellerId)).rejects.toThrow('Fetch failed');
    });

    it('handles empty sales data', async () => {
        repository.getSalesData.mockResolvedValue([]);
        const result = await useCase.execute('seller-123');
        expect(result).toEqual([]);
    });
});
