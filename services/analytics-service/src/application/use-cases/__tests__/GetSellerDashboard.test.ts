import { GetSellerDashboard } from '../GetSellerDashboard';
import { SellerAnalyticsRepository } from '../../../infrastructure/repositories/SellerAnalyticsRepository';

// Mock the repository
jest.mock('../../../infrastructure/repositories/SellerAnalyticsRepository');

describe('GetSellerDashboard', () => {
    let useCase: GetSellerDashboard;
    let repositoryFn: jest.Mocked<SellerAnalyticsRepository>;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Instantiate the mocked repository
        repositoryFn = new SellerAnalyticsRepository() as jest.Mocked<SellerAnalyticsRepository>;
        useCase = new GetSellerDashboard(repositoryFn);
    });

    it('should return seller metrics when repository succeeds', async () => {
        const sellerId = 'seller-123';
        const mockMetrics = {
            sellerId,
            averageOrderValue: 150,
            conversionRate: 0.03,
            createdAt: new Date()
        };

        // repositoryFn.getMetrics is a method on the instance
        repositoryFn.getMetrics.mockResolvedValue(mockMetrics as any);

        const result = await useCase.execute(sellerId);

        expect(repositoryFn.getMetrics).toHaveBeenCalledWith(sellerId);
        expect(result).toEqual(mockMetrics);
    });

    it('should throw an error when repository fails', async () => {
        const sellerId = 'seller-123';
        const error = new Error('Database error');
        repositoryFn.getMetrics.mockRejectedValue(error);

        await expect(useCase.execute(sellerId)).rejects.toThrow('Database error');
    });

    it('should handle missing seller', async () => {
        repositoryFn.getMetrics.mockResolvedValue(null);
        const result = await useCase.execute('seller-999');
        expect(result).toBeNull();
    });

    it('should validate seller ID', async () => {
        await expect(useCase.execute('')).rejects.toThrow('Invalid seller ID');
    });

    it('should return complete dashboard metrics', async () => {
        const mockMetrics = { sellerId: 's1', revenue: 5000, orders: 50, rating: 4.5 };
        repositoryFn.getMetrics.mockResolvedValue(mockMetrics as any);
        const result = await useCase.execute('s1');
        expect(result.revenue).toBe(5000);
    });

    it('should handle zero metrics', async () => {
        const mockMetrics = { sellerId: 's1', revenue: 0, orders: 0 };
        repositoryFn.getMetrics.mockResolvedValue(mockMetrics as any);
        const result = await useCase.execute('s1');
        expect(result.orders).toBe(0);
    });
});
