import { Enabler_ListingStatus } from '../types/enabler.types';

export interface ProductListingProps {
    id: string;
    enablerId: string;
    productId: string;
    sellerId: string;
    status: Enabler_ListingStatus;
    visibility: boolean;
    customPrice?: number | null;
    priceMarkup?: number | null;
    listingTerms?: Record<string, any> | null;
    sellerApproved: boolean;
    sellerApprovedAt?: Date | null;
    views: number;
    clicks: number;
    orders: number;
    revenue: number;
    metadata?: Record<string, any> | null;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date | null;
}

/**
 * ProductListing entity - Manages enabler-product relationships
 */
export class ProductListingEntity {
    private constructor(private readonly props: ProductListingProps) { }

    static create(props: ProductListingProps): ProductListingEntity {
        return new ProductListingEntity(props);
    }

    // Getters
    get id(): string {
        return this.props.id;
    }

    get enablerId(): string {
        return this.props.enablerId;
    }

    get productId(): string {
        return this.props.productId;
    }

    get sellerId(): string {
        return this.props.sellerId;
    }

    get status(): Enabler_ListingStatus {
        return this.props.status;
    }

    get isActive(): boolean {
        return this.props.status === Enabler_ListingStatus.ACTIVE &&
            this.props.visibility &&
            !this.isExpired();
    }

    get customPrice(): number | null | undefined {
        return this.props.customPrice;
    }

    get priceMarkup(): number | null | undefined {
        return this.props.priceMarkup;
    }

    get sellerApproved(): boolean {
        return this.props.sellerApproved;
    }

    // Business methods
    canBeListedByEnabler(): boolean {
        return this.props.status !== Enabler_ListingStatus.REMOVED;
    }

    respectsSellerPolicies(sellerPolicies: any): boolean {
        // Seller consent check
        if (!this.props.sellerApproved) return false;

        // Check if listing terms comply with seller policies
        if (sellerPolicies.requireApproval && !this.props.sellerApproved) return false;
        if (sellerPolicies.minPrice && this.props.customPrice && this.props.customPrice < sellerPolicies.minPrice) return false;
        if (sellerPolicies.maxMarkup && this.props.priceMarkup && this.props.priceMarkup > sellerPolicies.maxMarkup) return false;

        return true;
    }

    hasValidPricing(basePrice: number, minMarkup: number, maxMarkup: number): boolean {
        if (this.props.customPrice) {
            const impliedMarkup = (this.props.customPrice - basePrice) / basePrice;
            return impliedMarkup >= minMarkup && impliedMarkup <= maxMarkup;
        }

        if (this.props.priceMarkup) {
            return this.props.priceMarkup >= minMarkup && this.props.priceMarkup <= maxMarkup;
        }

        return true; // No custom pricing, use base price
    }

    isExpired(): boolean {
        if (!this.props.expiresAt) return false;
        return new Date() > this.props.expiresAt;
    }

    validateAgainstSellerRules(rules: {
        allowsEnablers: boolean;
        requiresApproval: boolean;
        minPrice?: number;
        maxMarkup?: number;
        blockedEnablers?: string[];
    }): boolean {
        if (!rules.allowsEnablers) return false;
        if (rules.blockedEnablers?.includes(this.props.enablerId)) return false;
        if (rules.requiresApproval && !this.props.sellerApproved) return false;

        return this.hasValidPricing(
            rules.minPrice || 0,
            0,
            rules.maxMarkup || 0.5
        );
    }

    // State transitions
    activate(): void {
        if (this.props.status === Enabler_ListingStatus.REMOVED) {
            throw new Error('Cannot activate a removed listing');
        }
        this.props.status = Enabler_ListingStatus.ACTIVE;
        this.props.visibility = true;
    }

    pause(): void {
        if (this.props.status !== Enabler_ListingStatus.ACTIVE) {
            throw new Error('Only active listings can be paused');
        }
        this.props.status = Enabler_ListingStatus.PAUSED;
    }

    remove(): void {
        this.props.status = Enabler_ListingStatus.REMOVED;
        this.props.visibility = false;
    }

    updateTerms(terms: Record<string, any>): void {
        this.props.listingTerms = terms;
        this.props.updatedAt = new Date();
    }

    updatePricing(customPrice?: number, priceMarkup?: number): void {
        this.props.customPrice = customPrice;
        this.props.priceMarkup = priceMarkup;
        this.props.updatedAt = new Date();
    }

  approveBySeller(sellerId: string): void {
        if (this.props.sellerId !== sellerId) {
            throw new Error('Only the product seller can approve this listing');
        }
        this.props.sellerApproved = true;
        this.props.sellerApprovedAt = new Date();
    }

    trackView(): void {
        this.props.views += 1;
    }

    trackClick(): void {
        this.props.clicks += 1;
    }

    trackOrder(orderAmount: number): void {
        this.props.orders += 1;
        this.props.revenue += orderAmount;
    }

    getConversionRate(): number {
        if (this.props.clicks === 0) return 0;
        return this.props.orders / this.props.clicks;
    }

    toPlainObject(): ProductListingProps {
        return { ...this.props };
    }
}
