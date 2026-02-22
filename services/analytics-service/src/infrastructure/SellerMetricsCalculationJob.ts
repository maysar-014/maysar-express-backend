import { GetSellerDashboardEnhanced } from '../../application/use-cases/GetSellerDashboardEnhanced';
import { CalculateRepeatCustomers } from '../../application/use-cases/CalculateRepeatCustomers';
import { IdentifyBestPerformingProduct } from '../../application/use-cases/IdentifyBestPerformingProduct';
import { GenerateSalesTrend } from '../../application/use-cases/GenerateSalesTrend';
import { CalculateInventoryHealth } from '../../application/use-cases/CalculateInventoryHealth';
import { CalculateProfitabilityScore } from '../../application/use-cases/CalculateProfitabilityScore';
import prisma from '../database/prisma';

export class SellerMetricsCalculationJob {
  async execute() {
    try {
      const activeSellers = await prisma.user_User.findMany({
        where: { role: 'SELLER', status: 'ACTIVE' },
        select: { id: true }
      });

      for (const seller of activeSellers) {
        await this.calculateMetricsForSeller(seller.id);
      }

      console.log(`[SellerMetricsCalculationJob] Completed for ${activeSellers.length} sellers`);
    } catch (error) {
      console.error('[SellerMetricsCalculationJob] Error:', error);
    }
  }

  private async calculateMetricsForSeller(sellerId: string) {
    try {
      const repeatCustomersUseCase = new CalculateRepeatCustomers();
      await repeatCustomersUseCase.execute(sellerId);

      const bestProductUseCase = new IdentifyBestPerformingProduct();
      await bestProductUseCase.execute(sellerId);

      const salesTrendUseCase = new GenerateSalesTrend();
      await salesTrendUseCase.execute(sellerId);

      const inventoryHealthUseCase = new CalculateInventoryHealth();
      await inventoryHealthUseCase.execute(sellerId);

      const profitabilityScoreUseCase = new CalculateProfitabilityScore();
      await profitabilityScoreUseCase.execute(sellerId);

      await prisma.analytics_SellerMetrics.update({
        where: { sellerId },
        data: { lastUpdated: new Date() }
      });
    } catch (error) {
      console.error(`[SellerMetricsCalculationJob] Error for seller ${sellerId}:`, error);
    }
  }
}
