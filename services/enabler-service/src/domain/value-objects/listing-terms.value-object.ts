/**
 * Value Object for Listing Terms
 */
export interface ListingTermsData {
    minOrderQuantity?: number;
    maxOrderQuantity?: number;
    deliveryTimeframe?: string;
    returnPolicy?: string;
    warrantyPeriod?: number;
    specialInstructions?: string;
    promotionalText?: string;
    restrictedRegions?: string[];
    [key: string]: any;
}

export class ListingTerms {
    private constructor(private readonly terms: ListingTermsData) {
        this.validate(terms);
    }

    static create(terms: ListingTermsData): ListingTerms {
        return new ListingTerms(terms);
    }

    static createDefault(): ListingTerms {
        return new ListingTerms({
            minOrderQuantity: 1,
            deliveryTimeframe: 'Standard',
            restrictedRegions: [],
        });
    }

    private validate(terms: ListingTermsData): void {
        if (terms.minOrderQuantity && terms.maxOrderQuantity) {
            if (terms.minOrderQuantity > terms.maxOrderQuantity) {
                throw new Error('Minimum order quantity cannot exceed maximum');
            }
        }

        if (terms.minOrderQuantity && terms.minOrderQuantity < 1) {
            throw new Error('Minimum order quantity must be at least 1');
        }

        if (terms.warrantyPeriod && terms.warrantyPeriod < 0) {
            throw new Error('Warranty period cannot be negative');
        }
    }

    getTerms(): ListingTermsData {
        return { ...this.terms };
    }

    getMinOrderQuantity(): number | undefined {
        return this.terms.minOrderQuantity;
    }

    getMaxOrderQuantity(): number | undefined {
        return this.terms.maxOrderQuantity;
    }

    getDeliveryTimeframe(): string | undefined {
        return this.terms.deliveryTimeframe;
    }

    hasReturnPolicy(): boolean {
        return !!this.terms.returnPolicy;
    }

    hasWarranty(): boolean {
        return !!this.terms.warrantyPeriod && this.terms.warrantyPeriod > 0;
    }

    isRegionRestricted(region: string): boolean {
        return this.terms.restrictedRegions?.includes(region) || false;
    }

    withMinOrderQuantity(quantity: number): ListingTerms {
        return new ListingTerms({ ...this.terms, minOrderQuantity: quantity });
    }

    withMaxOrderQuantity(quantity: number): ListingTerms {
        return new ListingTerms({ ...this.terms, maxOrderQuantity: quantity });
    }

    withDeliveryTimeframe(timeframe: string): ListingTerms {
        return new ListingTerms({ ...this.terms, deliveryTimeframe: timeframe });
    }

    withReturnPolicy(policy: string): ListingTerms {
        return new ListingTerms({ ...this.terms, returnPolicy: policy });
    }

    withWarranty(days: number): ListingTerms {
        return new ListingTerms({ ...this.terms, warrantyPeriod: days });
    }

    addRestrictedRegion(region: string): ListingTerms {
        const regions = [...(this.terms.restrictedRegions || []), region];
        return new ListingTerms({ ...this.terms, restrictedRegions: regions });
    }

    toJSON(): ListingTermsData {
        return this.getTerms();
    }

    equals(other: ListingTerms): boolean {
        return JSON.stringify(this.terms) === JSON.stringify(other.terms);
    }
}
