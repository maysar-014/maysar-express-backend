import { Enabler_ListingStatus, Enabler_Tier } from '@prisma/client';

export interface ProductListingContext {
    enablerTier: Enabler_Tier;
    enablerStatus: Enabler_Status;
    productStatus: string; // From catalog
    sellerAllowsEnablers: boolean;
    sellerBlockedEnablers?: string[];
    maxListingsPerEnabler?: number;
    currentListingsCount: number;
}

enum Enabler_Status {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    REJECTED = 'REJECTED'
}

export class ProductListingPolicy {

    static canListProduct(context: ProductListingContext, enablerId: string): { allowed: boolean; reason?: string } {
        if (context.enablerStatus !== Enabler_Status.ACTIVE) {
            return { allowed: false, reason: 'Enabler is not active' };
        }

        if (context.productStatus !== 'published') {
            return { allowed: false, reason: 'Product is not published' };
        }

        if (!context.sellerAllowsEnablers) {
            return { allowed: false, reason: 'Seller does not allow enablers for this product' };
        }

        if (context.sellerBlockedEnablers?.includes(enablerId)) {
            return { allowed: false, reason: 'Enabler is blocked by this seller' };
        }

        // Tier based limits
        const limit = this.getListingLimit(context.enablerTier);
        if (limit !== -1 && context.currentListingsCount >= limit) {
            return { allowed: false, reason: `Listing limit reached for ${context.enablerTier} tier` };
        }

        return { allowed: true };
    }

    private static getListingLimit(tier: Enabler_Tier): number {
        switch (tier) {
            case Enabler_Tier.BRONZE: return 50;
            case Enabler_Tier.SILVER: return 200;
            case Enabler_Tier.GOLD: return 1000;
            case Enabler_Tier.PLATINUM: return -1; // Unlimited
            default: return 50;
        }
    }

    static validatePricing(basePrice: number, customPrice: number, maxMarkupPercent: number = 0.5): boolean {
        if (customPrice < basePrice) return false; // Cannot sell below base price (unless subsidized, but simple rule for now)

        const markup = (customPrice - basePrice) / basePrice;
        return markup <= maxMarkupPercent;
    }
}
