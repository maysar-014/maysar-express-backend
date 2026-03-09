import { GetRetentionMetrics } from '../GetRetentionMetrics';
import { SellerAnalyticsRepository } from '../../../infrastructure/repositories/SellerAnalyticsRepository';
import { RetentionEngine } from '../../../domain/engines/RetentionEngine';

describe('GetRetentionMetrics', () => {
    it('formats seller activity for retention calculations', async () => {
        const repository = {
            getSellerActivityData: jest.fn().mockResolvedValue([
                { id: 's1', createdAt: new Date('2026-01-01T00:00:00.000Z') }
            ])
        } as unknown as jest.Mocked<Pick<SellerAnalyticsRepository, 'getSellerActivityData'>>;

        const engine = {
            calculateMetrics: jest.fn().mockReturnValue({
                retentionRate90Days: 70,
                churnRateMonthly: 5,
                avgTimeToFirstSaleDays: 8
            })
        } as unknown as jest.Mocked<Pick<RetentionEngine, 'calculateMetrics'>>;

        const useCase = new GetRetentionMetrics(
            repository as unknown as SellerAnalyticsRepository,
            engine as unknown as RetentionEngine
        );

        const result = await useCase.execute();

        expect(repository.getSellerActivityData).toHaveBeenCalledWith(90);
        expect(engine.calculateMetrics).toHaveBeenCalledWith(
            [
                {
                    sellerId: 's1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    lastOrderAt: null,
                    lastProductListedAt: null,
                    isActive: false
                }
            ],
            [{ sellerId: 's1', wasActivePreviousMonth: false, isActiveCurrentMonth: false }],
            [{ sellerId: 's1', userCreatedAt: new Date('2026-01-01T00:00:00.000Z'), firstOrderAt: null }]
        );
        expect(result).toEqual({
            retentionRate90Days: 70,
            churnRateMonthly: 5,
            avgTimeToFirstSaleDays: 8
        });
    });
});
