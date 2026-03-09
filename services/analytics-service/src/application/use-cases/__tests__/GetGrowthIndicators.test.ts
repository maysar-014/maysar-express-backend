import { GetGrowthIndicators } from '../GetGrowthIndicators';
import { SellerAnalyticsRepository } from '../../../infrastructure/repositories/SellerAnalyticsRepository';
import { GrowthIndicatorsEngine } from '../../../domain/engines/GrowthIndicatorsEngine';

describe('GetGrowthIndicators', () => {
    it('maps repository aggregates and returns growth metrics DTO', async () => {
        const repository = {
            getSellerRevenueTrends: jest.fn().mockResolvedValue([
                { sellerId: 's1', _sum: { totalAmount: 200 } }
            ]),
            getProductVelocityData: jest.fn().mockResolvedValue([
                { productId: 'p1', _sum: { quantity: 30 } }
            ]),
            getBuyerRetentionData: jest.fn().mockResolvedValue([
                { buyerId: 'b1', _count: { id: 2 } }
            ])
        } as unknown as jest.Mocked<
            Pick<
                SellerAnalyticsRepository,
                'getSellerRevenueTrends' | 'getProductVelocityData' | 'getBuyerRetentionData'
            >
        >;

        const engine = {
            calculateMetrics: jest.fn().mockReturnValue({
                revenueGrowthMoM: 40,
                productVelocityAvg: 3,
                repeatBuyerRate: 60
            })
        } as unknown as jest.Mocked<Pick<GrowthIndicatorsEngine, 'calculateMetrics'>>;

        const useCase = new GetGrowthIndicators(
            repository as unknown as SellerAnalyticsRepository,
            engine as unknown as GrowthIndicatorsEngine
        );

        const result = await useCase.execute();

        expect(repository.getSellerRevenueTrends).toHaveBeenCalledWith('monthly');
        expect(engine.calculateMetrics).toHaveBeenCalledWith(
            [{ sellerId: 's1', currentMonthRevenue: 200, previousMonthRevenue: 0 }],
            [{ productId: 'p1', totalQuantitySold: 30, daysSinceLaunch: 30 }],
            [{ buyerId: 'b1', orderCount: 2 }]
        );
        expect(result).toEqual({
            revenueGrowthMoM: 40,
            productVelocityAvg: 3,
            repeatBuyerRate: 60
        });
    });
});
