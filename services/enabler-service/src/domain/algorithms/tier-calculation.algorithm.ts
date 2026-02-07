import { Enabler_Tier } from '@prisma/client';

export interface EnablerPerformanceMetrics {
    totalSales: number;
    totalOrders: number;
    conversionRate: number;
    customerRating: number;
    disputeRate: number;
    daysActive: number;
}

export class TierCalculationAlgorithm {

    static calculateRecommendedTier(metrics: EnablerPerformanceMetrics): Enabler_Tier {
        if (metrics.disputeRate > 0.1) return Enabler_Tier.BRONZE; // Demote for high dispute rate

        // Platinum requirements
        if (metrics.totalSales >= 100000 && metrics.customerRating >= 4.8 && metrics.daysActive >= 180) {
            return Enabler_Tier.PLATINUM;
        }

        // Gold requirements
        if (metrics.totalSales >= 50000 && metrics.customerRating >= 4.5 && metrics.daysActive >= 90) {
            return Enabler_Tier.GOLD;
        }

        // Silver requirements
        if (metrics.totalSales >= 10000 && metrics.customerRating >= 4.0 && metrics.daysActive >= 30) {
            return Enabler_Tier.SILVER;
        }

        return Enabler_Tier.BRONZE;
    }
}
