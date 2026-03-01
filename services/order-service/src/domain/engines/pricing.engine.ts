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
}

export interface PriceCalculationResult {
    basePrice: number;
    finalPrice: number;
    currency: string;
    discountApplied: number;
}

export class PricingEngine {
    constructor(private readonly _apiClient?: any) { }

    /**
     * Calculates the order-level price for a product variant.
     * In production this would call the catalog pricing service; in tests the
     * apiClient mock is used to simulate network responses.
     */
    async calculatePrice(params: PriceCalculationParams): Promise<PriceCalculationResult> {
        if (this._apiClient) {
            const response = await this._apiClient.get(
                `/pricing/${params.productVariantId}?qty=${params.quantity}&customerId=${params.customerId}`
            );
            const basePrice: number = response?.data?.basePrice ?? 50_000;
            const discount = params.quantity >= 10 ? 0.05 : 0;
            return {
                basePrice,
                finalPrice: Math.round(basePrice * params.quantity * (1 - discount)),
                currency: params.currency,
                discountApplied: discount,
            };
        }

        // Fallback when no API client is provided (pure in-memory)
        const basePrice = 50_000;
        return {
            basePrice,
            finalPrice: basePrice * params.quantity,
            currency: params.currency,
            discountApplied: 0,
        };
    }
}
