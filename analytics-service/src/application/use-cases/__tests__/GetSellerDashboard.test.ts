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
});
