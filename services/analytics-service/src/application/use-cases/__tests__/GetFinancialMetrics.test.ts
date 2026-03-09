import { GetFinancialMetrics } from '../GetFinancialMetrics';
import { SellerAnalyticsRepository } from '../../../infrastructure/repositories/SellerAnalyticsRepository';
import { FinancialMetricsEngine } from '../../../domain/engines/FinancialMetricsEngine';

describe('GetFinancialMetrics', () => {
    it('maps repository data and returns financial metrics DTO', async () => {
        const repository = {
            getPayoutTimingData: jest.fn().mockResolvedValue([
                {
                    id: 'p1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    completedAt: new Date('2026-01-01T03:00:00.000Z')
                }
            ]),
            getCommissionDisputeData: jest.fn().mockResolvedValue([
                { id: 'd1', category: 'commission', status: 'OPEN' }
            ]),
            getTotalOrderCount: jest.fn().mockResolvedValue(50)
        } as unknown as jest.Mocked<
            Pick<
                SellerAnalyticsRepository,
                'getPayoutTimingData' | 'getCommissionDisputeData' | 'getTotalOrderCount'
            >
        >;

        const engine = {
            calculateMetrics: jest.fn().mockReturnValue({
                avgPayoutTimeHours: 3,
                avgWithdrawalTimeHours: 3,
                disputesPer100Orders: 2
            })
        } as unknown as jest.Mocked<Pick<FinancialMetricsEngine, 'calculateMetrics'>>;

        const useCase = new GetFinancialMetrics(
            repository as unknown as SellerAnalyticsRepository,
            engine as unknown as FinancialMetricsEngine
        );

        const result = await useCase.execute();

        expect(repository.getPayoutTimingData).toHaveBeenCalled();
        expect(repository.getCommissionDisputeData).toHaveBeenCalled();
        expect(repository.getTotalOrderCount).toHaveBeenCalled();
        expect(engine.calculateMetrics).toHaveBeenCalledWith(
            [
                {
                    payoutId: 'p1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    completedAt: new Date('2026-01-01T03:00:00.000Z')
                }
            ],
            [
                {
                    payoutId: 'p1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    completedAt: new Date('2026-01-01T03:00:00.000Z')
                }
            ],
            [{ ticketId: 'd1', category: 'commission', status: 'OPEN' }],
            50
        );
        expect(result).toEqual({
            avgPayoutTimeHours: 3,
            avgWithdrawalTimeHours: 3,
            disputesPer100Orders: 2
        });
    });
});
