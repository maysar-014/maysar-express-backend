import { Enabler_Tier } from '../types/enabler.types';

export interface CommissionCalculationInput {
    orderAmount: number;
    enablerTier: Enabler_Tier;
    baseCommissionRate: number;
    performanceMetrics: {
        conversionRate: number;
        customerRating: number;
        totalOrders: number;
        disputeRate: number;
    };
    sellerPolicies?: {
        customCommissionRate?: number;
        maxCommissionCap?: number;
    };
}

export interface CommissionBreakdown {
    baseCommission: number;
    tierBonus: number;
    performanceBonus: number;
    totalCommission: number;
    commissionRate: number;
    sellerPayout: number;
    platformFee: number;
}

/**
 * CommissionCalculationEngine - Calculates enabler commission
 * Integrates with existing commission system
 * Pure business logic with no side effects
 */
export class CommissionCalculationEngine {
    private static readonly PLATFORM_FEE_RATE = 0.02; // 2% platform fee
    private static readonly MAX_COMMISSION_RATE = 0.25; // 25% cap
    private static readonly MIN_COMMISSION_AMOUNT = 5.0;

    /**
     * Calculate enabler commission with detailed breakdown
     */
    static calculate(input: CommissionCalculationInput): CommissionBreakdown {
        // Start with base commission rate
        let effectiveRate = input.baseCommissionRate;

        // Apply seller custom rate if provided
        if (input.sellerPolicies?.customCommissionRate) {
            effectiveRate = input.sellerPolicies.customCommissionRate;
        }

        // Calculate tier adjustement
        const tierMultiplier = this.getTierMultiplier(input.enablerTier);
        const tierAdjustedRate = effectiveRate * tierMultiplier;

        // Calculate performance multiplier
        const performanceMultiplier = this.calculatePerformanceMultiplier(input.performanceMetrics);

        // Calculate final commission rate (capped at max)
        const finalRate = Math.min(tierAdjustedRate * performanceMultiplier, this.MAX_COMMISSION_RATE);

        // Calculate base commission
        const baseCommission = input.orderAmount * input.baseCommissionRate;

        // Calculate tier bonus
        const tierBonus = input.orderAmount * effectiveRate * (tierMultiplier - 1.0);

        // Calculate performance bonus
        const performanceBonus = input.orderAmount * tierAdjustedRate * (performanceMultiplier - 1.0);

        // Calculate total commission
        let totalCommission = input.orderAmount * finalRate;

        // Apply seller commission cap if provided
        if (input.sellerPolicies?.maxCommissionCap) {
            totalCommission = Math.min(totalCommission, input.sellerPolicies.maxCommissionCap);
        }

        // Apply minimum commission threshold
        if (totalCommission < this.MIN_COMMISSION_AMOUNT) {
            totalCommission = this.MIN_COMMISSION_AMOUNT;
        }

        // Calculate platform fee (taken from order amount)
        const platformFee = input.orderAmount * this.PLATFORM_FEE_RATE;

        // Calculate seller payout (order amount - commission - platform fee)
        const sellerPayout = input.orderAmount - totalCommission - platformFee;

        return {
            baseCommission: this.roundToTwoDecimals(baseCommission),
            tierBonus: this.roundToTwoDecimals(tierBonus),
            performanceBonus: this.roundToTwoDecimals(performanceBonus),
            totalCommission: this.roundToTwoDecimals(totalCommission),
            commissionRate: this.roundToFourDecimals(finalRate),
            sellerPayout: this.roundToTwoDecimals(sellerPayout),
            platformFee: this.roundToTwoDecimals(platformFee),
        };
    }

    /**
     * Get tier multiplier for commission calculation
     */
    private static getTierMultiplier(tier: Enabler_Tier): number {
        switch (tier) {
            case Enabler_Tier.BRONZE:
                return 1.0;
            case Enabler_Tier.SILVER:
                return 1.1;
            case Enabler_Tier.GOLD:
                return 1.2;
            case Enabler_Tier.PLATINUM:
                return 1.3;
            default:
                return 1.0;
        }
    }

    /**
     * Calculate performance multiplier based on metrics
     */
    private static calculatePerformanceMultiplier(metrics: CommissionCalculationInput['performanceMetrics']): number {
        let multiplier = 1.0;

        // Conversion rate bonus (up to +10%)
        if (metrics.conversionRate >= 0.10) multiplier += 0.10;
        else if (metrics.conversionRate >= 0.07) multiplier += 0.07;
        else if (metrics.conversionRate >= 0.05) multiplier += 0.05;

        // Customer rating bonus (up to +10%)
        if (metrics.customerRating >= 4.8) multiplier += 0.10;
        else if (metrics.customerRating >= 4.5) multiplier += 0.07;
        else if (metrics.customerRating >= 4.0) multiplier += 0.05;

        // Order volume bonus (up to +5%)
        if (metrics.totalOrders >= 1000) multiplier += 0.05;
        else if (metrics.totalOrders >= 500) multiplier += 0.03;
        else if (metrics.totalOrders >= 100) multiplier += 0.02;

        // Dispute rate penalty (up to -15%)
        if (metrics.disputeRate >= 0.10) multiplier -= 0.15;
        else if (metrics.disputeRate >= 0.05) multiplier -= 0.10;
        else if (metrics.disputeRate >= 0.03) multiplier -= 0.05;

        // Ensure multiplier is at least 1.0 (no negative performance impact on base)
        return Math.max(multiplier, 0.85);
    }

    /**
     * Validate commission calculation input
     */
    static validateInput(input: CommissionCalculationInput): void {
        if (input.orderAmount <= 0) {
            throw new Error('Order amount must be positive');
        }

        if (input.baseCommissionRate < 0 || input.baseCommissionRate > 1) {
            throw new Error('Invalid commission rate');
        }

        if (input.performanceMetrics.conversionRate < 0 || input.performanceMetrics.conversionRate > 1) {
            throw new Error('Invalid conversion rate');
        }

        if (input.performanceMetrics.customerRating < 0 || input.performanceMetrics.customerRating > 5) {
            throw new Error('Invalid customer rating');
        }

        if (input.performanceMetrics.disputeRate < 0 || input.performanceMetrics.disputeRate > 1) {
            throw new Error('Invalid dispute rate');
        }
    }

    private static roundToTwoDecimals(value: number): number {
        return Math.round(value * 100) / 100;
    }

    private static roundToFourDecimals(value: number): number {
        return Math.round(value * 10000) / 10000;
    }
}
