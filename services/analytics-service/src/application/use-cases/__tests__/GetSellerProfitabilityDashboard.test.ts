import { GetSellerProfitabilityDashboard } from '../GetSellerProfitabilityDashboard';
import { SellerAnalyticsRepository } from '../../../infrastructure/repositories/SellerAnalyticsRepository';
import { GetRevenueHealthMetrics } from '../GetRevenueHealthMetrics';
import { GetGrowthIndicators } from '../GetGrowthIndicators';
import { GetRetentionMetrics } from '../GetRetentionMetrics';
import { GetFinancialMetrics } from '../GetFinancialMetrics';
import { GetHappinessSignals } from '../GetHappinessSignals';

describe('GetSellerProfitabilityDashboard', () => {
    it('aggregates child use-cases into dashboard DTO', async () => {
        const repository = {
            getGMV: jest.fn().mockResolvedValue({ toNumber: () => 1500 }),
            getActiveSellersCount: jest.fn().mockResolvedValue([{ sellerId: 's1' }, { sellerId: 's2' }])
        } as unknown as jest.Mocked<Pick<SellerAnalyticsRepository, 'getGMV' | 'getActiveSellersCount'>>;

        const revenueHealthUseCase = {
            execute: jest.fn().mockResolvedValue({
                arpsWeekly: 10,
                arpsMonthly: 30,
                medianRevenue: 20,
                revenueDistributionTop20: 60
            })
        } as unknown as jest.Mocked<Pick<GetRevenueHealthMetrics, 'execute'>>;

        const growthIndicatorsUseCase = {
            execute: jest.fn().mockResolvedValue({
                revenueGrowthMoM: 25,
                productVelocityAvg: 2,
                repeatBuyerRate: 40
            })
        } as unknown as jest.Mocked<Pick<GetGrowthIndicators, 'execute'>>;

        const retentionMetricsUseCase = {
            execute: jest.fn().mockResolvedValue({
                retentionRate90Days: 75,
                churnRateMonthly: 4,
                avgTimeToFirstSaleDays: 7
            })
        } as unknown as jest.Mocked<Pick<GetRetentionMetrics, 'execute'>>;

        const financialMetricsUseCase = {
            execute: jest.fn().mockResolvedValue({
                avgPayoutTimeHours: 12,
                avgWithdrawalTimeHours: 12,
                disputesPer100Orders: 1
            })
        } as unknown as jest.Mocked<Pick<GetFinancialMetrics, 'execute'>>;

        const happinessSignalsUseCase = {
            execute: jest.fn().mockResolvedValue({
                productExpansionRate: 50,
                referralCount: 3
            })
        } as unknown as jest.Mocked<Pick<GetHappinessSignals, 'execute'>>;

        const useCase = new GetSellerProfitabilityDashboard(
            repository as unknown as SellerAnalyticsRepository,
            revenueHealthUseCase as unknown as GetRevenueHealthMetrics,
            growthIndicatorsUseCase as unknown as GetGrowthIndicators,
            retentionMetricsUseCase as unknown as GetRetentionMetrics,
            financialMetricsUseCase as unknown as GetFinancialMetrics,
            happinessSignalsUseCase as unknown as GetHappinessSignals
        );

        const result = await useCase.execute('seller-1');

        expect(repository.getGMV).toHaveBeenCalledWith(expect.any(Date), expect.any(Date));
        expect(repository.getActiveSellersCount).toHaveBeenCalledWith(30);
        expect(revenueHealthUseCase.execute).toHaveBeenCalledWith('monthly');
        expect(result.topRow).toEqual({
            gmv: 1500,
            activeSellers: 2,
            arps: 30,
            repeatBuyerRate: 40
        });
        expect(result.secondRow).toEqual({
            sellerRetentionPercent: 75,
            churnPercent: 4,
            medianRevenue: 20,
            payoutTimeHours: 12
        });
        expect(result.thirdRow.revenueDistribution).toEqual({
            top20Percent: 60,
            restPercent: 40
        });
        expect(result.sellerId).toBe('seller-1');
    });
});
