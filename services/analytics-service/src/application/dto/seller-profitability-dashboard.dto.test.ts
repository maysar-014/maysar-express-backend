import type {
  FinancialMetricsDTO,
  GrowthIndicatorsDTO,
  HappinessSignalsDTO,
  RetentionMetricsDTO,
  RevenueHealthMetricsDTO,
  SellerProfitabilityDashboardDTO
} from './seller-profitability-dashboard.dto';

describe('seller-profitability-dashboard DTO contracts', () => {
  it('supports profitability dashboard aggregate payload', () => {
    const dashboard: SellerProfitabilityDashboardDTO = {
      topRow: {
        gmv: 18000000,
        activeSellers: 220,
        arps: 81000,
        repeatBuyerRate: 0.34
      },
      secondRow: {
        sellerRetentionPercent: 86,
        churnPercent: 4.2,
        medianRevenue: 500000,
        payoutTimeHours: 22
      },
      thirdRow: {
        revenueDistribution: { top20Percent: 72, restPercent: 28 },
        growthPerSeller: [
          {
            sellerId: 'seller-1',
            growthPercentage: 12,
            currentMonthRevenue: 900000,
            previousMonthRevenue: 800000
          }
        ],
        timeToFirstSale: 5,
        productVelocityHeatmap: [
          { productId: 'p-1', velocity: 1.2, quantitySold: 45, daysSinceLaunch: 30 }
        ]
      },
      timestamp: new Date('2026-03-08T00:00:00.000Z'),
      sellerId: 'seller-1'
    };

    expect(dashboard.topRow.gmv).toBe(18000000);
    expect(dashboard.thirdRow.growthPerSeller[0].sellerId).toBe('seller-1');
  });

  it('supports section metric DTO payloads', () => {
    const revenue: RevenueHealthMetricsDTO = {
      arpsWeekly: 79000,
      arpsMonthly: 81000,
      medianRevenue: 500000,
      revenueDistributionTop20: 72
    };
    const growth: GrowthIndicatorsDTO = {
      revenueGrowthMoM: 11.4,
      productVelocityAvg: 1.3,
      repeatBuyerRate: 0.34
    };
    const retention: RetentionMetricsDTO = {
      retentionRate90Days: 84,
      churnRateMonthly: 4.2,
      avgTimeToFirstSaleDays: 5
    };
    const financial: FinancialMetricsDTO = {
      avgPayoutTimeHours: 22,
      avgWithdrawalTimeHours: 15,
      disputesPer100Orders: 1.1
    };
    const happiness: HappinessSignalsDTO = {
      productExpansionRate: 0.2,
      referralCount: 17
    };

    expect(revenue.arpsMonthly).toBe(81000);
    expect(growth.revenueGrowthMoM).toBeGreaterThan(10);
    expect(retention.avgTimeToFirstSaleDays).toBe(5);
    expect(financial.disputesPer100Orders).toBe(1.1);
    expect(happiness.referralCount).toBe(17);
  });
});
