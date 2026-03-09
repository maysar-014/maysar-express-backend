import { GetCourierAnalytics } from '../GetCourierAnalytics';
import { CourierAnalyticsRepository } from '../../../infrastructure/repositories/CourierAnalyticsRepository';

describe('GetCourierAnalytics', () => {
    let useCase: GetCourierAnalytics;
    let repository: jest.Mocked<Pick<CourierAnalyticsRepository, 'getAnalytics'>>;

    beforeEach(() => {
        repository = {
            getAnalytics: jest.fn()
        };
        useCase = new GetCourierAnalytics(repository as unknown as CourierAnalyticsRepository);
    });

    it('returns courier analytics from repository', async () => {
        const courierId = 'courier-001';
        const mockResult = { courierId, performanceScore: 4.8, deliveriesCompleted: 12 };

        repository.getAnalytics.mockResolvedValue(mockResult as never);

        const result = await useCase.execute(courierId);

        expect(repository.getAnalytics).toHaveBeenCalledWith(courierId);
        expect(result).toBe(mockResult);
    });

    it('returns null for missing couriers', async () => {
        repository.getAnalytics.mockResolvedValue(null);
        const result = await useCase.execute('courier-999');
        expect(result).toBeNull();
    });

    it('propagates repository errors', async () => {
        repository.getAnalytics.mockRejectedValue(new Error('DB error'));
        await expect(useCase.execute('courier-001')).rejects.toThrow('DB error');
    });
});
