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
});
