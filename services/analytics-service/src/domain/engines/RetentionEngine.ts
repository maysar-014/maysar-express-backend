export interface RetentionMetrics {
  retentionRate90Days: number;
  churnRateMonthly: number;
  avgTimeToFirstSaleDays: number;
}

export interface SellerActivityData {
  sellerId: string;
  createdAt: Date;
  lastOrderAt: Date | null;
  lastProductListedAt: Date | null;
  isActive: boolean;
}

export interface SellerChurnData {
  sellerId: string;
  wasActivePreviousMonth: boolean;
  isActiveCurrentMonth: boolean;
}

export interface TimeToFirstSaleData {
  sellerId: string;
  userCreatedAt: Date;
  firstOrderAt: Date | null;
}

export class RetentionEngine {
  calculateRetention90Days(sellerActivityData: SellerActivityData[]): number {
    if (sellerActivityData.length === 0) return 0;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const eligibleSellers = sellerActivityData.filter(seller => seller.createdAt <= ninetyDaysAgo);
    if (eligibleSellers.length === 0) return 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeSellers = eligibleSellers.filter(seller => {
      const hasRecentOrder = seller.lastOrderAt && seller.lastOrderAt >= thirtyDaysAgo;
      const hasRecentProduct = seller.lastProductListedAt && seller.lastProductListedAt >= thirtyDaysAgo;
      return hasRecentOrder || hasRecentProduct;
    }).length;

    return (activeSellers / eligibleSellers.length) * 100;
  }

  calculateChurnRate(churnData: SellerChurnData[]): number {
    if (churnData.length === 0) return 0;

    const churned = churnData.filter(
      seller => seller.wasActivePreviousMonth && !seller.isActiveCurrentMonth
    ).length;

    const totalSellers = churnData.filter(seller => seller.wasActivePreviousMonth).length;
    if (totalSellers === 0) return 0;

    return (churned / totalSellers) * 100;
  }

  calculateTimeToFirstSale(timeToFirstSaleData: TimeToFirstSaleData[]): number {
    if (timeToFirstSaleData.length === 0) return 0;

    const validData = timeToFirstSaleData.filter(seller => seller.firstOrderAt !== null);
    if (validData.length === 0) return 0;

    const totalDays = validData.reduce((sum, seller) => {
      const firstOrderDate = seller.firstOrderAt!;
      const daysDiff = Math.floor(
        (firstOrderDate.getTime() - seller.userCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      return sum + Math.max(0, daysDiff);
    }, 0);

    return totalDays / validData.length;
  }

  calculateMetrics(
    sellerActivityData: SellerActivityData[],
    churnData: SellerChurnData[],
    timeToFirstSaleData: TimeToFirstSaleData[]
  ): RetentionMetrics {
    return {
      retentionRate90Days: this.calculateRetention90Days(sellerActivityData),
      churnRateMonthly: this.calculateChurnRate(churnData),
      avgTimeToFirstSaleDays: Math.round(this.calculateTimeToFirstSale(timeToFirstSaleData))
    };
  }
}
