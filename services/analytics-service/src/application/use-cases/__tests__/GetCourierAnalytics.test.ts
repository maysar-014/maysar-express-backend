import { GetCourierAnalytics } from '../GetCourierAnalytics';
import { CourierAnalyticsRepository } from '../../../infrastructure/repositories/CourierAnalyticsRepository';

jest.mock('../../../infrastructure/repositories/CourierAnalyticsRepository');

describe('GetCourierAnalytics', () => {
    let useCase: GetCourierAnalytics;
    let repository: any;

    beforeEach(() => {
        jest.clearAllMocks();
        const MockRepo = require('../../../infrastructure/repositories/CourierAnalyticsRepository').CourierAnalyticsRepository;
        repository = new MockRepo();
        useCase = new GetCourierAnalytics(repository);
    });

    it('should return courier analytics', async () => {
        const courierId = 'courier-001';
        const mockResult = { courierId, performanceScore: 4.8 };

        repository.getMetrics = jest.fn().mockResolvedValue(mockResult);

        const result = await useCase.execute(courierId);

        expect(repository.getMetrics).toHaveBeenCalledWith(courierId);
        expect(result).toBe(mockResult);
    });

    it('should handle missing courier', async () => {
        repository.getMetrics = jest.fn().mockResolvedValue(null);
        const result = await useCase.execute('courier-999');
        expect(result).toBeNull();
    });

    it('should handle repository errors', async () => {
        repository.getMetrics = jest.fn().mockRejectedValue(new Error('DB error'));
        await expect(useCase.execute('courier-001')).rejects.toThrow('DB error');
    });

    it('should return metrics with delivery stats', async () => {
        const mockResult = { courierId: 'c1', deliveries: 100, onTimeRate: 0.95 };
        repository.getMetrics = jest.fn().mockResolvedValue(mockResult);
        const result = await useCase.execute('c1');
        expect(result.deliveries).toBe(100);
    });

    it('should handle empty metrics', async () => {
        repository.getMetrics = jest.fn().mockResolvedValue({});
        const result = await useCase.execute('c1');
        expect(result).toEqual({});
    });

    it('should validate courier ID format', async () => {
        await expect(useCase.execute('')).rejects.toThrow('Invalid courier ID');
    });
});
