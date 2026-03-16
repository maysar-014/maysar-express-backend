/**
 * Pricing Engine (order-service local adapter)
 * Provides a simple `calculatePrice()` API for order-level price calculations.
 * For sophisticated catalog pricing strategies, see catalog-service/domain/engines/pricing-engine.ts.
 */

export interface PriceCalculationParams {
    productVariantId: string;
    quantity: number;
    customerId: string;
    currency: string;
    customerType?: string;
    shippingAddress?: {
        street?: string;
        city?: string;
        region?: string;
        country?: string;
    };
}

export interface PriceCalculationResult {
    basePrice: number;
    finalPrice: number;
    currency: string;
    discountApplied: number;
    shippingCost?: number;
}

export class PricingEngine {
    constructor(private readonly apiClient: { get: (path: string) => Promise<any> }) { }

    /**
     * Calculates the order-level price for a product variant.
     * Calls the catalog pricing service for authoritative pricing data.
     */
    async calculatePrice(params: PriceCalculationParams): Promise<PriceCalculationResult> {
        const response = await this.apiClient.get(
            `/pricing/${params.productVariantId}?qty=${params.quantity}&customerId=${params.customerId}`
        );
        const basePrice: number | undefined = response?.data?.basePrice;
        if (basePrice === undefined || basePrice === null) {
            throw new Error('PricingEngine: base price missing from pricing service response.');
        }
        const discount = params.quantity >= 10 ? 0.05 : 0;
        const shippingCost: number = response?.data?.shippingCost ?? 0;
        return {
            basePrice,
            finalPrice: Math.round(basePrice * params.quantity * (1 - discount)),
            currency: params.currency,
            discountApplied: discount,
            shippingCost,
        };
    }
}
