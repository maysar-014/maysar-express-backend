import { SellerAnalyticsRepository } from '../repositories/SellerAnalyticsRepository';
import { GetRevenueHealthMetrics } from '../../application/use-cases/GetRevenueHealthMetrics';
import { GetGrowthIndicators } from '../../application/use-cases/GetGrowthIndicators';
import { GetRetentionMetrics } from '../../application/use-cases/GetRetentionMetrics';
import { GetFinancialMetrics } from '../../application/use-cases/GetFinancialMetrics';
import { GetHappinessSignals } from '../../application/use-cases/GetHappinessSignals';
import { RevenueHealthEngine } from '../../domain/engines/RevenueHealthEngine';
import { GrowthIndicatorsEngine } from '../../domain/engines/GrowthIndicatorsEngine';
import { RetentionEngine } from '../../domain/engines/RetentionEngine';
import { FinancialMetricsEngine } from '../../domain/engines/FinancialMetricsEngine';
import { SellerHappinessEngine } from '../../domain/engines/SellerHappinessEngine';

export class SchedulerService {
  private repository: SellerAnalyticsRepository;
  private revenueHealthEngine: RevenueHealthEngine;
  private growthIndicatorsEngine: GrowthIndicatorsEngine;
  private retentionEngine: RetentionEngine;
  private financialMetricsEngine: FinancialMetricsEngine;
  private sellerHappinessEngine: SellerHappinessEngine;

  constructor() {
    this.repository = new SellerAnalyticsRepository();
    this.revenueHealthEngine = new RevenueHealthEngine();
    this.growthIndicatorsEngine = new GrowthIndicatorsEngine();
    this.retentionEngine = new RetentionEngine();
    this.financialMetricsEngine = new FinancialMetricsEngine();
    this.sellerHappinessEngine = new SellerHappinessEngine();
  }

  async computeHourlyMetrics(): Promise<void> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const gmv = await this.repository.getGMV(thirtyDaysAgo, now);
      const activeSellers = await this.repository.getActiveSellersCount(30);

      console.log(`[Hourly] GMV: ${gmv}, Active Sellers: ${activeSellers.length}`);
    } catch (error) {
      console.error('Error computing hourly metrics:', error);
    }
  }

  async computeDailyMetrics(): Promise<void> {
    try {
      const retentionUseCase = new GetRetentionMetrics(this.repository, this.retentionEngine);
      const metrics = await retentionUseCase.execute();

      console.log(`[Daily] Retention: ${metrics.retentionRate90Days}%, Churn: ${metrics.churnRateMonthly}%`);
    } catch (error) {
      console.error('Error computing daily metrics:', error);
    }
  }

  async computeWeeklyMetrics(): Promise<void> {
    try {
      const productVelocity = await this.repository.getProductVelocityData();
      const revenueHealth = new GetRevenueHealthMetrics(this.repository, this.revenueHealthEngine);
      const metrics = await revenueHealth.execute('weekly');

      console.log(`[Weekly] ARPS: ${metrics.arpsWeekly}, Distribution: ${metrics.revenueDistributionTop20}%`);
    } catch (error) {
      console.error('Error computing weekly metrics:', error);
    }
  }

  async computeMonthlyMetrics(): Promise<void> {
    try {
      const growthUseCase = new GetGrowthIndicators(this.repository, this.growthIndicatorsEngine);
      const metrics = await growthUseCase.execute();

      console.log(`[Monthly] MoM Growth: ${metrics.revenueGrowthMoM}%, Repeat Buyers: ${metrics.repeatBuyerRate}%`);
    } catch (error) {
      console.error('Error computing monthly metrics:', error);
    }
  }

  startScheduler(): void {
    // Hourly: Update real-time metrics
    setInterval(() => this.computeHourlyMetrics(), 60 * 60 * 1000);

    // Daily: Calculate retention, churn, time to first sale
    setInterval(() => this.computeDailyMetrics(), 24 * 60 * 60 * 1000);

    // Weekly: Calculate product velocity, revenue distribution
    setInterval(() => this.computeWeeklyMetrics(), 7 * 24 * 60 * 60 * 1000);

    // Monthly: Calculate MoM growth trends
    setInterval(() => this.computeMonthlyMetrics(), 30 * 24 * 60 * 60 * 1000);

    console.log('Metric scheduler started');
  }
}
