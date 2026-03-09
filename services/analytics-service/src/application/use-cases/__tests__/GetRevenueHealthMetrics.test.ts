import { GetRevenueHealthMetrics } from '../GetRevenueHealthMetrics';
import { SellerAnalyticsRepository } from '../../../infrastructure/repositories/SellerAnalyticsRepository';
import { RevenueHealthEngine } from '../../../domain/engines/RevenueHealthEngine';

describe('GetRevenueHealthMetrics', () => {
    it('returns revenue health metrics for requested time window', async () => {
        const repository = {
            getSellerRevenueTrends: jest.fn().mockResolvedValue([
                { sellerId: 's1', _sum: { totalAmount: 100 } },
                { sellerId: 's2', _sum: { totalAmount: 50 } }
            ])
        } as unknown as jest.Mocked<Pick<SellerAnalyticsRepository, 'getSellerRevenueTrends'>>;

        const engine = {
            calculateMetrics: jest.fn().mockReturnValue({
                arpsWeekly: 10,
                arpsMonthly: 20,
                medianRevenue: 15,
                revenueDistributionTop20: 60
            })
        } as unknown as jest.Mocked<Pick<RevenueHealthEngine, 'calculateMetrics'>>;

        const useCase = new GetRevenueHealthMetrics(
            repository as unknown as SellerAnalyticsRepository,
            engine as unknown as RevenueHealthEngine
        );

        const monthly = await useCase.execute();
        const weekly = await useCase.execute('weekly');

        expect(repository.getSellerRevenueTrends).toHaveBeenNthCalledWith(1, 'monthly');
        expect(repository.getSellerRevenueTrends).toHaveBeenNthCalledWith(2, 'weekly');
        expect(engine.calculateMetrics).toHaveBeenNthCalledWith(1, [100, 50], 'monthly');
        expect(engine.calculateMetrics).toHaveBeenNthCalledWith(2, [100, 50], 'weekly');
        expect(monthly).toEqual({
            arpsWeekly: 10,
            arpsMonthly: 20,
            medianRevenue: 15,
            revenueDistributionTop20: 60
        });
        expect(weekly).toEqual(monthly);
    });
});
