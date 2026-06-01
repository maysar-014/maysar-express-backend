import { Order } from '../entities/order.entity';

export interface EligibilityResult {
    eligible: boolean;
    reason?: string;
    /** Only present when eligible: true and per-order risk assessment ran */
    requiresCommitmentFee?: boolean;
    /** Only present when eligible: true and per-order risk assessment ran */
    requiresManualReview?: boolean;
    /** Only present when requiresCommitmentFee is true */
    commitmentFeeAmount?: number;
}

export interface IAuthServiceClient {
    isUserVerified(userId: string): Promise<boolean>;
}

export interface IUserServiceClient {
    getCODReputation(userId: string): Promise<{
        score: number;
        successfulOrders: number;
        suspendedUntil?: Date;
        permanentlyDisabled?: boolean;
    }>;
}

export interface ILogisticsServiceClient {
    isCODSupportedInArea(address: any): Promise<boolean>;
    isCrossRegionDelivery(address: any, sellerAddress: any): Promise<boolean>;
}

export class CODEligibilityEngine {
    private readonly MIN_REPUTATION_SCORE = 50;
    private readonly MIN_SUCCESSFUL_ORDERS = 3;
    private readonly MIN_COD_AMOUNT = 1000;
    private readonly MAX_COD_AMOUNT = 500000;

    constructor(
        private readonly authService: IAuthServiceClient,
        private readonly userService: IUserServiceClient,
        private readonly logisticsService: ILogisticsServiceClient
    ) { }

    async checkBuyerEligibility(buyerId: string): Promise<EligibilityResult> {
        const [isVerified, reputation] = await Promise.all([
            this.authService.isUserVerified(buyerId),
            this.userService.getCODReputation(buyerId)
        ]);

        if (!isVerified) {
            return { eligible: false, reason: 'Buyer must be identity verified for COD' };
        }

        if (reputation.permanentlyDisabled) {
            return { eligible: false, reason: 'COD has been permanently disabled for this account' };
        }

        if (reputation.suspendedUntil && reputation.suspendedUntil > new Date()) {
            return { eligible: false, reason: `COD access is suspended until ${reputation.suspendedUntil.toISOString()}` };
        }

        if (reputation.score < this.MIN_REPUTATION_SCORE) {
            return { eligible: false, reason: `COD reputation score (${reputation.score}) is below required minimum of ${this.MIN_REPUTATION_SCORE}` };
        }

        if (reputation.successfulOrders < this.MIN_SUCCESSFUL_ORDERS) {
            return { eligible: false, reason: `Buyer must have at least ${this.MIN_SUCCESSFUL_ORDERS} successful orders to unlock COD privilege` };
        }

        return { eligible: true };
    }

    async checkSellerEligibility(sellerId: string): Promise<EligibilityResult> {
        // In a real system, we'd check if the seller is verified and has enabled COD
        // For now, assume all verified sellers support COD
        const isVerified = await this.authService.isUserVerified(sellerId);
        if (!isVerified) {
            return { eligible: false, reason: 'Seller must be verified to accept COD' };
        }
        return { eligible: true };
    }

    async checkOrderEligibility(order: Order, sellerAddress: any): Promise<EligibilityResult> {
        const amount = Number(order.totalAmount);
        if (amount < this.MIN_COD_AMOUNT || amount > this.MAX_COD_AMOUNT) {
            return {
                eligible: false,
                reason: `Order amount must be between ${this.MIN_COD_AMOUNT} and ${this.MAX_COD_AMOUNT} TZS for COD`
            };
        }

        const isSupportedArea = await this.logisticsService.isCODSupportedInArea(order.deliveryAddress);
        if (!isSupportedArea) {
            return { eligible: false, reason: 'COD is not supported in the selected delivery area' };
        }

        const isCrossRegion = await this.logisticsService.isCrossRegionDelivery(order.deliveryAddress, sellerAddress);
        if (isCrossRegion) {
            return { eligible: false, reason: 'COD is not available for cross-region deliveries' };
        }

        // High-risk SKU check (placeholder logic)
        const hasHighRiskSKU = order.items.some(item => this.isHighRiskSKU(item.productId));
        if (hasHighRiskSKU) {
            return { eligible: false, reason: 'Order contains high-risk items ineligible for COD' };
        }

        return { eligible: true };
    }

    calculateCommitmentFee(deliveryFee: number): number {
        if (!Number.isFinite(deliveryFee) || deliveryFee <= 0) {
            throw new Error('Delivery fee must be greater than zero');
        }

        return deliveryFee;
    }

    private isHighRiskSKU(_productId: string): boolean {
        // Placeholder for high-risk item detection logic
        // e.g. certain electronics, high-value jewelry, etc.
        return false;
    }
}
