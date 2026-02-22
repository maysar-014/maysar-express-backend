export interface QuickHealthCheckDTO {
  gmv: number;
  activeSellers: number;
  arps: number;
  repeatBuyerRate: number;
}

export interface CoreMetricsDTO {
  sellerRetentionPercent: number;
  churnPercent: number;
  medianRevenue: number;
  payoutTimeHours: number;
}

export interface RevenueDistributionDTO {
  top20Percent: number;
  restPercent: number;
}

export interface SellerGrowthChartDTO {
  sellerId: string;
  growthPercentage: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
}

export interface ProductVelocityDTO {
  productId: string;
  velocity: number;
  quantitySold: number;
  daysSinceLaunch: number;
}

export interface DetailedAnalyticsDTO {
  revenueDistribution: RevenueDistributionDTO;
  growthPerSeller: SellerGrowthChartDTO[];
  timeToFirstSale: number;
  productVelocityHeatmap: ProductVelocityDTO[];
}

export interface SellerProfitabilityDashboardDTO {
  topRow: QuickHealthCheckDTO;
  secondRow: CoreMetricsDTO;
  thirdRow: DetailedAnalyticsDTO;
  timestamp: Date;
  sellerId?: string;
}

export interface RevenueHealthMetricsDTO {
  arpsWeekly: number;
  arpsMonthly: number;
  medianRevenue: number;
  revenueDistributionTop20: number;
}

export interface GrowthIndicatorsDTO {
  revenueGrowthMoM: number;
  productVelocityAvg: number;
  repeatBuyerRate: number;
}

export interface RetentionMetricsDTO {
  retentionRate90Days: number;
  churnRateMonthly: number;
  avgTimeToFirstSaleDays: number;
}

export interface FinancialMetricsDTO {
  avgPayoutTimeHours: number;
  avgWithdrawalTimeHours: number;
  disputesPer100Orders: number;
}

export interface HappinessSignalsDTO {
  productExpansionRate: number;
  referralCount: number;
}
