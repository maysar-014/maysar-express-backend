import { CODEligibilityEngine } from '../../domain/engines/cod-eligibility.engine';
import { Order } from '../../domain/entities/order.entity';

export interface CheckCODEligibilityInput {
    buyerId: string;
    sellerId: string;
    totalAmount: number;
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

        // Calculate commitment fee if eligible
        const commitmentFee = this.eligibilityEngine.calculateCommitmentFee(input.totalAmount);

        return {
            eligible: true,
            commitmentFee
        };
    }
}
