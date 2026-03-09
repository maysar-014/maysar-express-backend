import { Enabler_Tier } from '../types/enabler.types';

export interface Product {
    id: string;
    categoryId: string;
    sellerId: string;
    price: number;
    location?: string;
}

export interface EnablerProfile {
    id: string;
    tier: Enabler_Tier;
    categoryExpertise?: string[];
    location?: string;
    performanceScore: number;
}

export interface ProductMatch {
    productId: string;
    matchScore: number;
    reasons: string[];
}

/**
 * ProductMatchingEngine - Match enablers with suitable products
 * Pure business logic for recommendation algorithm
 */
export class ProductMatchingEngine {
    /**
     * Match products to enabler based on expertise, location, and performance
     */
    static matchProducts(enabler: EnablerProfile, products: Product[]): ProductMatch[] {
        const matches: ProductMatch[] = products.map(product => {
            const score = this.calculateMatchScore(enabler, product);
            const reasons = this.getMatchReasons(enabler, product, score);

            return {
                productId: product.id,
                matchScore: score,
                reasons,
            };
        });

        // Sort by match score (descending)
        return matches.sort((a, b) => b.matchScore - a.matchScore);
    }

    /**
     * Calculate match score between enabler and product
     */
    private static calculateMatchScore(enabler: EnablerProfile, product: Product): number {
        let score = 0;

        // Category expertise (0-40 points)
        if (enabler.categoryExpertise?.includes(product.categoryId)) {
            score += 40;
        } else if (enabler.categoryExpertise && enabler.categoryExpertise.length > 0) {
            // Partial credit if has some expertise
            score += 10;
        }

        // Location proximity (0-20 points)
        if (enabler.location && product.location) {
            if (enabler.location === product.location) {
                score += 20;
            } else {
                // Could implement more sophisticated location matching
                score += 5;
            }
        }

        // Tier-based access (0-20 points)
        const tierScore = this.getTierScore(enabler.tier);
        score += tierScore;

        // Performance score (0-20 points)
        // Assuming performance score is 0-100
        score += (enabler.performanceScore / 100) * 20;

        return Math.min(score, 100); // Cap at 100
    }

    /**
     * Get score based on enabler tier
     */
    private static getTierScore(tier: Enabler_Tier): number {
        switch (tier) {
            case Enabler_Tier.PLATINUM:
                return 20;
            case Enabler_Tier.GOLD:
                return 15;
            case Enabler_Tier.SILVER:
                return 10;
            case Enabler_Tier.BRONZE:
                return 5;
            default:
                return 0;
        }
    }

    /**
     * Generate match reasons for transparency
     */
    private static getMatchReasons(enabler: EnablerProfile, product: Product, score: number): string[] {
        const reasons: string[] = [];

        if (score >= 80) {
            reasons.push('Excellent match');
        } else if (score >= 60) {
            reasons.push('Good match');
        } else if (score >= 40) {
            reasons.push('Fair match');
        } else {
            reasons.push('Low match - consider other products');
        }

        if (enabler.categoryExpertise?.includes(product.categoryId)) {
            reasons.push(`Expertise in product category`);
        }

        if (enabler.location === product.location) {
            reasons.push('Same location as seller');
        }

        if (enabler.tier === Enabler_Tier.PLATINUM || enabler.tier === Enabler_Tier.GOLD) {
            reasons.push('Premium tier access');
        }

        if (enabler.performanceScore >= 80) {
            reasons.push('High performance score');
        }

        return reasons;
    }

    /**
     * Filter products based on seller policies
     */
    static filterBySellerPolicies(
        products: Product[],
        sellerPolicies: Map<string, { allowsEnablers: boolean; blockedEnablers?: string[]; enablerTierRequired?: Enabler_Tier }>
    ): Product[] {
        return products.filter(product => {
            const policy = sellerPolicies.get(product.sellerId);
            if (!policy) return true; // No policy, allow by default

            return policy.allowsEnablers;
        });
    }

    /**
     * Recommend top N products for enabler
     */
    static recommend(enabler: EnablerProfile, products: Product[], topN: number = 10): ProductMatch[] {
        const matches = this.matchProducts(enabler, products);
        return matches.slice(0, topN);
    }

    /**
     * Check if enabler can list a specific product
     */
    static canListProduct(
        enabler: EnablerProfile,
        product: Product,
        sellerPolicy?: {
            allowsEnablers: boolean;
            blockedEnablers?: string[];
            enablerTierRequired?: Enabler_Tier;
            categoryRestrictions?: string[];
        }
    ): { canList: boolean; reason?: string } {
        if (!sellerPolicy) {
            return { canList: true };
        }

        if (!sellerPolicy.allowsEnablers) {
            return { canList: false, reason: 'Seller does not allow enablers' };
        }

        if (sellerPolicy.blockedEnablers?.includes(enabler.id)) {
            return { canList: false, reason: 'Enabler is blocked by seller' };
        }

        if (sellerPolicy.enablerTierRequired) {
            const requiredTierValue = this.getTierValue(sellerPolicy.enablerTierRequired);
            const enablerTierValue = this.getTierValue(enabler.tier);

            if (enablerTierValue < requiredTierValue) {
                return { canList: false, reason: `Requires ${sellerPolicy.enablerTierRequired} tier or higher` };
            }
        }

        if (sellerPolicy.categoryRestrictions && !sellerPolicy.categoryRestrictions.includes(product.categoryId)) {
            return { canList: false, reason: 'Product category not allowed' };
        }

        return { canList: true };
    }

    /**
     * Get numeric value for tier comparison
     */
    private static getTierValue(tier: Enabler_Tier): number {
        switch (tier) {
            case Enabler_Tier.BRONZE:
                return 1;
            case Enabler_Tier.SILVER:
                return 2;
            case Enabler_Tier.GOLD:
                return 3;
            case Enabler_Tier.PLATINUM:
                return 4;
            default:
                return 0;
        }
    }
}
