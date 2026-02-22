import { Decimal } from '@prisma/client/runtime/library';

export interface RevenueHealthMetrics {
  arpsWeekly: number;
  arpsMonthly: number;
  medianRevenue: number;
  revenueDistributionTop20: number;
}

export class RevenueHealthEngine {
  calculateARPS(
    totalRevenue: Decimal | number,
    activeSellersCount: number,
    timeWindow: 'weekly' | 'monthly'
  ): number {
    if (activeSellersCount === 0) return 0;
    const revenue = typeof totalRevenue === 'object' ? totalRevenue.toNumber() : totalRevenue;
    return revenue / activeSellersCount;
  }

  calculateMedianRevenue(sellerRevenues: number[]): number {
    if (sellerRevenues.length === 0) return 0;
    const sorted = [...sellerRevenues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  calculateRevenueDistribution(sellerRevenues: number[]): number {
    if (sellerRevenues.length === 0) return 0;
    const sorted = [...sellerRevenues].sort((a, b) => b - a);
    const top20Count = Math.ceil(sorted.length * 0.2);
    const top20Revenue = sorted.slice(0, top20Count).reduce((sum, rev) => sum + rev, 0);
    const totalRevenue = sorted.reduce((sum, rev) => sum + rev, 0);
    return totalRevenue === 0 ? 0 : (top20Revenue / totalRevenue) * 100;
  }

  calculateMetrics(
    sellerRevenues: number[],
    timeWindow: 'weekly' | 'monthly'
  ): RevenueHealthMetrics {
    const activeSellers = sellerRevenues.filter(r => r > 0).length;
    const totalRevenue = sellerRevenues.reduce((sum, r) => sum + r, 0);

    return {
      arpsWeekly: timeWindow === 'weekly' ? this.calculateARPS(totalRevenue, activeSellers, 'weekly') : 0,
      arpsMonthly: timeWindow === 'monthly' ? this.calculateARPS(totalRevenue, activeSellers, 'monthly') : 0,
      medianRevenue: this.calculateMedianRevenue(sellerRevenues),
      revenueDistributionTop20: this.calculateRevenueDistribution(sellerRevenues)
    };
  }
}
