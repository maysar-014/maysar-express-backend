export interface GrowthIndicatorsMetrics {
  revenueGrowthMoM: number;
  productVelocityAvg: number;
  repeatBuyerRate: number;
}

export interface SellerGrowthData {
  sellerId: string;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
}

export interface ProductVelocityData {
  productId: string;
  totalQuantitySold: number;
  daysSinceLaunch: number;
}

export interface BuyerRetentionData {
  buyerId: string;
  orderCount: number;
}

export class GrowthIndicatorsEngine {
  calculateRevenueGrowthMoM(sellerGrowthData: SellerGrowthData[]): number {
    if (sellerGrowthData.length === 0) return 0;

    const sellersWithPositiveGrowth = sellerGrowthData.filter(seller => {
      if (seller.previousMonthRevenue === 0) return seller.currentMonthRevenue > 0;
      const growth = (seller.currentMonthRevenue - seller.previousMonthRevenue) / seller.previousMonthRevenue;
      return growth > 0;
    }).length;

    return (sellersWithPositiveGrowth / sellerGrowthData.length) * 100;
  }

  calculateProductVelocity(productData: ProductVelocityData[]): number {
    if (productData.length === 0) return 0;

    const velocities = productData.map(product => {
      if (product.daysSinceLaunch === 0) return 0;
      return product.totalQuantitySold / product.daysSinceLaunch;
    });

    return velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
  }

  calculateRepeatBuyerRate(buyerRetentionData: BuyerRetentionData[]): number {
    if (buyerRetentionData.length === 0) return 0;

    const repeatBuyers = buyerRetentionData.filter(buyer => buyer.orderCount > 1).length;
    return (repeatBuyers / buyerRetentionData.length) * 100;
  }

  calculateMetrics(
    sellerGrowthData: SellerGrowthData[],
    productVelocityData: ProductVelocityData[],
    buyerRetentionData: BuyerRetentionData[]
  ): GrowthIndicatorsMetrics {
    return {
      revenueGrowthMoM: this.calculateRevenueGrowthMoM(sellerGrowthData),
      productVelocityAvg: this.calculateProductVelocity(productVelocityData),
      repeatBuyerRate: this.calculateRepeatBuyerRate(buyerRetentionData)
    };
  }
}
