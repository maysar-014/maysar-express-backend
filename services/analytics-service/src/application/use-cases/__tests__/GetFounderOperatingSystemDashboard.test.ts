import { GetFounderOperatingSystemDashboard } from '../GetFounderOperatingSystemDashboard';
import { SellerAnalyticsRepository } from '../../../infrastructure/repositories/SellerAnalyticsRepository';
import { GetRevenueHealthMetrics } from '../GetRevenueHealthMetrics';
import { GetGrowthIndicators } from '../GetGrowthIndicators';
import { GetRetentionMetrics } from '../GetRetentionMetrics';
import { GetFinancialMetrics } from '../GetFinancialMetrics';
import { GetHappinessSignals } from '../GetHappinessSignals';
import { RedFlagEngine } from '../../../domain/engines/RedFlagEngine';

describe('GetFounderOperatingSystemDashboard', () => {
  it('maps platform metrics into the MDOS founder dashboard structure', async () => {
    const repository = {
      getGMV: jest.fn().mockResolvedValue({ toNumber: () => 1250000 }),
      getActiveSellersCount: jest.fn().mockResolvedValue([{ sellerId: 'seller-1' }, { sellerId: 'seller-2' }]),
      getTotalSellersCount: jest.fn().mockResolvedValue(4),
      getDailyActiveUsersCount: jest.fn().mockResolvedValue(48),
      getBuyerConversionRate: jest.fn().mockResolvedValue(19.4),
      getOrdersCount: jest.fn().mockResolvedValue(12),
      getCheckoutSessionCount: jest.fn().mockResolvedValue(62),
      getSupportTicketsCreatedCount: jest
        .fn()
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(17),
      getSupportTicketsResolvedCount: jest.fn().mockResolvedValue(3),
      getOpenSupportTicketsCount: jest.fn().mockResolvedValue(9),
      getSellerMetricsRollup: jest.fn().mockResolvedValue({
        avgConversionRate: 21.5,
        avgCartAbandonment: 8.2,
        avgPendingCustomerQuestions: 4.1,
        totalLowConversionProducts: 6
      })
    } as unknown as jest.Mocked<
      Pick<
        SellerAnalyticsRepository,
        | 'getGMV'
        | 'getActiveSellersCount'
        | 'getTotalSellersCount'
        | 'getDailyActiveUsersCount'
        | 'getBuyerConversionRate'
        | 'getOrdersCount'
        | 'getCheckoutSessionCount'
        | 'getSupportTicketsCreatedCount'
        | 'getSupportTicketsResolvedCount'
        | 'getOpenSupportTicketsCount'
        | 'getSellerMetricsRollup'
      >
    >;

    const revenueHealthUseCase = {
      execute: jest.fn().mockResolvedValue({
        arpsWeekly: 22000,
        arpsMonthly: 91000,
        medianRevenue: 32000,
        revenueDistributionTop20: 74
      })
    } as unknown as jest.Mocked<Pick<GetRevenueHealthMetrics, 'execute'>>;

    const growthIndicatorsUseCase = {
      execute: jest.fn().mockResolvedValue({
        revenueGrowthMoM: 15,
        productVelocityAvg: 1.8,
        repeatBuyerRate: 36
      })
    } as unknown as jest.Mocked<Pick<GetGrowthIndicators, 'execute'>>;

    const retentionMetricsUseCase = {
      execute: jest.fn().mockResolvedValue({
        retentionRate90Days: 58,
        churnRateMonthly: 9,
        avgTimeToFirstSaleDays: 6
      })
    } as unknown as jest.Mocked<Pick<GetRetentionMetrics, 'execute'>>;

    const financialMetricsUseCase = {
      execute: jest.fn().mockResolvedValue({
        avgPayoutTimeHours: 27,
        avgWithdrawalTimeHours: 22,
        disputesPer100Orders: 1.5
      })
    } as unknown as jest.Mocked<Pick<GetFinancialMetrics, 'execute'>>;

    const happinessSignalsUseCase = {
      execute: jest.fn().mockResolvedValue({
        productExpansionRate: 18,
        referralCount: 11
      })
    } as unknown as jest.Mocked<Pick<GetHappinessSignals, 'execute'>>;

    const redFlagEngine = {
      detectRedFlags: jest.fn().mockReturnValue([
        {
          type: 'low_retention',
          severity: 'critical',
          message: '90-day seller retention is below threshold',
          metric: 'Seller Retention',
          currentValue: 58,
          threshold: 60
        }
      ])
    } as unknown as jest.Mocked<Pick<RedFlagEngine, 'detectRedFlags'>>;

    const useCase = new GetFounderOperatingSystemDashboard(
      repository as unknown as SellerAnalyticsRepository,
      revenueHealthUseCase as unknown as GetRevenueHealthMetrics,
      growthIndicatorsUseCase as unknown as GetGrowthIndicators,
      retentionMetricsUseCase as unknown as GetRetentionMetrics,
      financialMetricsUseCase as unknown as GetFinancialMetrics,
      happinessSignalsUseCase as unknown as GetHappinessSignals,
      redFlagEngine as unknown as RedFlagEngine
    );

    const result = await useCase.execute();

    expect(repository.getGMV).toHaveBeenCalledTimes(1);
    expect(repository.getSupportTicketsCreatedCount).toHaveBeenCalledTimes(2);
    expect(revenueHealthUseCase.execute).toHaveBeenCalledWith('monthly');
    expect(result.title).toBe('Maysar Daily Operating System');
    expect(result.currentBottleneck.type).toBe('low_retention');
    expect(result.primaryObjective).toContain('retention');
    expect(result.phases).toHaveLength(5);
    expect(result.phases[0].metrics[1]).toEqual(
      expect.objectContaining({
        key: 'daily_active_users',
        value: 48,
        status: 'automated'
      })
    );
    expect(result.phases[1].metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'critical_tasks_complete',
          value: null,
          status: 'manual'
        })
      ])
    );
    expect(result.weeklyReview.metrics[0]).toEqual(
      expect.objectContaining({
        key: 'weekly_issues_raised',
        value: 17
      })
    );
    expect(result.dataGaps).toHaveLength(3);
  });
});
