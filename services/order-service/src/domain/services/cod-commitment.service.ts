export interface IWalletServiceClient {
    placeHold(userId: string, amount: number, currency: string, reason: string): Promise<string>;
    releaseHold(holdId: string): Promise<void>;
    captureHold(holdId: string): Promise<void>;
}

/**
 * CODCommitmentService
 *
 * Manages the wallet hold for COD orders.
 *
 * In BOTH scenarios, the delivery fee is held in the buyer's wallet BEFORE
 * the order is packaged. This protects the seller and Maysar from ghost orders
 * and ensures delivery costs are secured upfront.
 *
 * SCENARIO A — Seller offers FREE delivery (deliveryFee = 0):
 *   - Hold amount = logistics-estimated delivery cost (commitment fee).
 *   - Maysar pays the courier and recoups from the hold on delivery.
 *   - Buyer pays courier at door: FULL product price only.
 *   - On delivery: hold CAPTURED → Maysar recoups delivery cost.
 *   - On cancellation before dispatch: hold RELEASED back to buyer.
 *   - On delivery refusal: hold FORFEITED as penalty.
 *
 * SCENARIO B — Seller charges delivery fee (deliveryFee > 0):
 *   - Hold amount = delivery fee.
 *   - Delivery fee is secured before packaging begins.
 *   - Buyer pays courier at door: FULL product price only (delivery already paid via hold).
 *   - On delivery: hold CAPTURED → paid to courier/seller.
 *   - On cancellation before dispatch: hold RELEASED back to buyer.
 *   - On delivery refusal: hold FORFEITED as penalty.
 *
 * In both cases: cash on delivery = product price only.
 */
export class CODCommitmentService {
    constructor(
        private readonly walletService: IWalletServiceClient
    ) { }

    /**
     * Calculate the hold amount for a COD order.
     *
     * @param deliveryFee - Seller's delivery fee (0 = free delivery)
     * @param logisticsEstimate - Logistics service estimate (used when deliveryFee = 0)
     */
    calculateCommitmentFee(deliveryFee: number, logisticsEstimate: number): number {
        if (deliveryFee > 0) {
            // Scenario B: hold the actual delivery fee
            if (!Number.isFinite(deliveryFee)) {
                throw new Error('Delivery fee must be a finite number');
            }
            return deliveryFee;
        }
        // Scenario A: hold the logistics estimate as commitment fee
        if (!Number.isFinite(logisticsEstimate) || logisticsEstimate < 0) {
            throw new Error('Logistics estimate must be a non-negative finite number for free-delivery COD orders');
        }
        return logisticsEstimate;
    }

    /**
     * Place the wallet hold before packaging begins.
     *
     * @param isFreeDelivery - true = Scenario A (commitment fee), false = Scenario B (delivery fee)
     */
    async secureCommitment(
        userId: string,
        orderId: string,
        amount: number,
        currency: string,
        isFreeDelivery: boolean
    ): Promise<string> {
        const reason = isFreeDelivery
            ? `COD Commitment Fee for Order ${orderId} — free delivery secured`
            : `COD Delivery Fee for Order ${orderId} — secured before packaging`;
        return await this.walletService.placeHold(userId, amount, currency, reason);
    }

    /** Release hold back to buyer (cancellation before dispatch). */
    async releaseCommitment(holdId: string): Promise<void> {
        await this.walletService.releaseHold(holdId);
    }

    /** Capture hold on confirmed delivery (settles delivery cost). */
    async captureCommitment(holdId: string): Promise<void> {
        await this.walletService.captureHold(holdId);
    }

    /** Forfeit hold as penalty (delivery refused / no-show). */
    async forfeitCommitment(holdId: string): Promise<void> {
        await this.walletService.captureHold(holdId);
    }
}
