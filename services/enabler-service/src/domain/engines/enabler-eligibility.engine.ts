import { Enabler_Tier } from '../types/enabler.types';

export interface EnablerEligibilityInput {
    businessName: string;
    businessDescription?: string;
    taxId?: string;
    yearsInBusiness?: number;
    hasBusinessLicense: boolean;
    creditScore?: number;
    monthlyRevenue?: number;
    salesExperience: number; // in years
}

export interface EligibilityResult {
    isEligible: boolean;
    initialTier: Enabler_Tier;
    commissionRate: number;
    reasons: string[];
    requirements: string[];
}

/**
 * EnablerEligibilityEngine - Determines if a user qualifies as an enabler
 * Pure business logic with no side effects
 */
export class EnablerEligibilityEngine {
    private static readonly MIN_SALES_EXPERIENCE = 0.5; // 6 months
    private static readonly MIN_CREDIT_SCORE = 550;
    private static readonly BRONZE_COMMISSION_RATE = 0.15;
    private static readonly SILVER_COMMISSION_RATE = 0.17;
    private static readonly GOLD_COMMISSION_RATE = 0.19;

    /**
     * Determine if user qualifies as enabler
     */
    static determineEligibility(input: EnablerEligibilityInput): EligibilityResult {
        const reasons: string[] = [];
        const requirements: string[] = [];
        let isEligible = true;

        // Basic requirements
        if (!input.businessName || input.businessName.trim().length === 0) {
            isEligible = false;
            requirements.push('Valid business name required');
        }

        if (!input.hasBusinessLicense) {
            isEligible = false;
            requirements.push('Valid business license required');
        } else {
            reasons.push('Has valid business license');
        }

        // Experience requirements
        if (input.salesExperience < this.MIN_SALES_EXPERIENCE) {
            isEligible = false;
            requirements.push(`Minimum ${this.MIN_SALES_EXPERIENCE * 12} months sales experience required`);
        } else {
            reasons.push(`${input.salesExperience} years sales experience`);
        }

        // Credit score (optional but influences tier)
        if (input.creditScore !== undefined) {
            if (input.creditScore < this.MIN_CREDIT_SCORE) {
                isEligible = false;
                requirements.push(`Minimum credit score of ${this.MIN_CREDIT_SCORE} required`);
            } else {
                reasons.push(`Credit score: ${input.creditScore}`);
            }
        }

        // Tax ID (required for certain tiers)
        if (!input.taxId && input.monthlyRevenue && input.monthlyRevenue > 10000) {
            requirements.push('Tax ID required for high-revenue businesses');
        }

        // Calculate initial tier
        const initialTier = this.calculateInitialTier(input);
        const commissionRate = this.getCommissionRateForTier(initialTier);

        return {
            isEligible,
            initialTier,
            commissionRate,
            reasons,
            requirements,
        };
    }

    /**
     * Calculate initial tier based on application data
     */
    static calculateInitialTier(input: EnablerEligibilityInput): Enabler_Tier {
        let score = 0;

        // Sales experience (0-30 points)
        if (input.salesExperience >= 5) score += 30;
        else if (input.salesExperience >= 3) score += 20;
        else if (input.salesExperience >= 1) score += 10;
        else score += 5;

        // Credit score (0-25 points)
        if (input.creditScore !== undefined) {
            if (input.creditScore >= 750) score += 25;
            else if (input.creditScore >= 700) score += 20;
            else if (input.creditScore >= 650) score += 15;
            else if (input.creditScore >= 600) score += 10;
            else score += 5;
        }

        // Monthly revenue (0-25 points)
        if (input.monthlyRevenue !== undefined) {
            if (input.monthlyRevenue >= 100000) score += 25;
            else if (input.monthlyRevenue >= 50000) score += 20;
            else if (input.monthlyRevenue >= 20000) score += 15;
            else if (input.monthlyRevenue >= 10000) score += 10;
            else score += 5;
        }

        // Years in business (0-20 points)
        if (input.yearsInBusiness !== undefined) {
            if (input.yearsInBusiness >= 5) score += 20;
            else if (input.yearsInBusiness >= 3) score += 15;
            else if (input.yearsInBusiness >= 1) score += 10;
            else score += 5;
        }

        // Tax ID (bonus 10 points)
        if (input.taxId) score += 10;

        // Determine tier based on score (0-110 possible)
        if (score >= 80) return Enabler_Tier.GOLD;
        if (score >= 60) return Enabler_Tier.SILVER;
        return Enabler_Tier.BRONZE;
    }

    /**
     * Get commission rate for a given tier
     */
    private static getCommissionRateForTier(tier: Enabler_Tier): number {
        switch (tier) {
            case Enabler_Tier.BRONZE:
                return this.BRONZE_COMMISSION_RATE;
            case Enabler_Tier.SILVER:
                return this.SILVER_COMMISSION_RATE;
            case Enabler_Tier.GOLD:
                return this.GOLD_COMMISSION_RATE;
            case Enabler_Tier.PLATINUM:
                return 0.22;
            default:
                return this.BRONZE_COMMISSION_RATE;
        }
    }

    /**
     * Validate minimum requirements
     */
    static meetsMinimumRequirements(input: EnablerEligibilityInput): boolean {
        return (
            !!input.businessName &&
            input.hasBusinessLicense &&
            input.salesExperience >= this.MIN_SALES_EXPERIENCE &&
            (!input.creditScore || input.creditScore >= this.MIN_CREDIT_SCORE)
        );
    }
}
