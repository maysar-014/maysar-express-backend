import { CODEligibilityEngine } from '../../domain/engines/cod-eligibility.engine';
import { Order } from '../../domain/entities/order.entity';
import { assessMinimumBasketValue } from '@shared/business/minimum-basket-value';
import { CatalogProductRepository } from '../../infrastructure/repositories/catalog-product.repository';

export interface CheckCODEligibilityInput {
    buyerId: string;
    sellerId: string;
    totalAmount: number;
    deliveryFee: number;
    currency: string;
    deliveryAddress: any;
    sellerAddress: any;
    items: { productId: string; quantity: number; price: number }[];
}

export interface CODEligibilityResponse {
    eligible: boolean;
    commitmentFee?: number;
    reason?: string;
}

export class CheckCODEligibilityUseCase {
    constructor(private readonly eligibilityEngine: CODEligibilityEngine) { }

    async execute(input: CheckCODEligibilityInput): Promise<CODEligibilityResponse> {
        const minimumBasketValueAssessment = assessMinimumBasketValue(input.totalAmount);
        if (!minimumBasketValueAssessment.eligible) {
            return {
                eligible: false,
                reason: minimumBasketValueAssessment.message
            };
        }

        // Enforce the product-level COD flag. Only products whose catalog record has
        // codAccepted=true may be paid on delivery. This is the authoritative backend
        // guard — the frontend gates this via payOnDelivery, but the API must not
        // trust client input for a risk-bearing payment method.
        const productBlockReason = await this.resolveProductCodBlock(input.items);
        if (productBlockReason) {
            return { eligible: false, reason: productBlockReason };
        }

        // Check buyer eligibility
        const buyerResult = await this.eligibilityEngine.checkBuyerEligibility(input.buyerId);
        if (!buyerResult.eligible) {
            return { eligible: false, reason: buyerResult.reason };
        }

        // Check seller eligibility
        const sellerResult = await this.eligibilityEngine.checkSellerEligibility(input.sellerId);
        if (!sellerResult.eligible) {
            return { eligible: false, reason: sellerResult.reason };
        }

        // Create a temporary order object for checking order eligibility
        const tempOrder = new Order({
            id: 'temp',
            buyerId: input.buyerId,
            sellerId: input.sellerId,
            items: input.items,
            totalAmount: input.totalAmount,
            currency: input.currency,
            deliveryAddress: input.deliveryAddress,
            paymentMethod: 'cod',
            status: 'pending'
        });

        // Check order eligibility
        const orderResult = await this.eligibilityEngine.checkOrderEligibility(tempOrder, input.sellerAddress);
        if (!orderResult.eligible) {
            return { eligible: false, reason: orderResult.reason };
        }

        // Use the delivery fee as the COD commitment fee
        const commitmentFee = this.eligibilityEngine.calculateCommitmentFee(input.deliveryFee);

        return {
            eligible: true,
            commitmentFee
        };
    }

    /**
     * Verifies every item's product accepts COD. Returns a blocking reason, or null
     * when all products accept COD. Fails closed: if the catalog cannot be queried,
     * COD is refused rather than allowing an order the product doesn't support.
     */
    private async resolveProductCodBlock(
        items: { productId: string; quantity: number; price: number }[]
    ): Promise<string | null> {
        const productIds = items.map((item) => item.productId).filter(Boolean);
        if (productIds.length === 0) return null;

        try {
            const nonCod = await new CatalogProductRepository().findNonCodProductIds(productIds);
            return nonCod.length > 0
                ? 'One or more items do not support Cash on Delivery'
                : null;
        } catch (error) {
            return 'Unable to verify Cash on Delivery eligibility for these items';
        }
    }
}
