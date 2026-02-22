import { GetSalesAnalytics } from '../GetSalesAnalytics';
import { SellerAnalyticsRepository } from '../../../infrastructure/repositories/SellerAnalyticsRepository';

jest.mock('../../../infrastructure/repositories/SellerAnalyticsRepository');

describe('GetSalesAnalytics', () => {
    let useCase: GetSalesAnalytics;
    let repository: jest.Mocked<SellerAnalyticsRepository>;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new SellerAnalyticsRepository() as jest.Mocked<SellerAnalyticsRepository>;
        useCase = new GetSalesAnalytics(repository);
    });

    it('should return sales data when found', async () => {
        const sellerId = 'seller-123';
        const mockData = [
            { date: new Date(), revenue: 100, orders: 5 }
        ];

        repository.getSalesData.mockResolvedValue(mockData as any);

        const result = await useCase.execute(sellerId);

        expect(repository.getSalesData).toHaveBeenCalledWith(sellerId);
        expect(result).toBe(mockData);
    });

    it('should propagate errors from repository', async () => {
        const sellerId = 'seller-123';
        repository.getSalesData.mockRejectedValue(new Error('Fetch failed'));

        await expect(useCase.execute(sellerId)).rejects.toThrow('Fetch failed');
    });

    it('should handle empty sales data', async () => {
        repository.getSalesData.mockResolvedValue([]);
        const result = await useCase.execute('seller-123');
        expect(result).toEqual([]);
    });

    it('should validate seller ID', async () => {
        await expect(useCase.execute('')).rejects.toThrow('Invalid seller ID');
    });

    it('should return aggregated metrics', async () => {
        const mockData = [{ date: new Date(), revenue: 200, orders: 10 }];
        repository.getSalesData.mockResolvedValue(mockData as any);
        const result = await useCase.execute('seller-123');
        expect(result[0].revenue).toBe(200);
    });

    it('should handle date range queries', async () => {
        const mockData = [{ date: new Date(), revenue: 150, orders: 7 }];
        repository.getSalesData.mockResolvedValue(mockData as any);
        const result = await useCase.execute('seller-123', { startDate: '2024-01-01', endDate: '2024-12-31' });
        expect(result).toBe(mockData);
    });
});
