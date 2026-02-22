export interface SellerHappinessMetrics {
  productExpansionRate: number;
  referralCount: number;
}

export interface ProductExpansionData {
  sellerId: string;
  userCreatedAt: Date;
  firstProductAddedAt: Date | null;
  totalProductsAdded: number;
}

export interface ReferralData {
  referrerId: string;
  referralId: string;
  status: string;
}

export class SellerHappinessEngine {
  calculateProductExpansion(productExpansionData: ProductExpansionData[]): number {
    if (productExpansionData.length === 0) return 0;

    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

    const sellersWithExpansion = productExpansionData.filter(seller => {
      if (!seller.firstProductAddedAt) return false;
      const daysSinceCreation = seller.firstProductAddedAt.getTime() - seller.userCreatedAt.getTime();
      return daysSinceCreation >= thirtyDaysInMs && seller.totalProductsAdded > 1;
    }).length;

    return (sellersWithExpansion / productExpansionData.length) * 100;
  }

  calculateReferralCount(referralData: ReferralData[]): number {
    // Count completed referrals
    return referralData.filter(ref => ref.status === 'completed').length;
  }

  calculateMetrics(
    productExpansionData: ProductExpansionData[],
    referralData: ReferralData[]
  ): SellerHappinessMetrics {
    return {
      productExpansionRate: this.calculateProductExpansion(productExpansionData),
      referralCount: this.calculateReferralCount(referralData)
    };
  }
}
