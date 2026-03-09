import { Enabler_OrderStatus } from '../types/enabler.types';

export interface EnablerOrderProps {
    id: string;
    enablerId: string;
    orderId: string;
    sellerId: string;
    buyerId: string;
    productListingId: string;
    status: Enabler_OrderStatus;
    orderAmount: number;
    productAmount: number;
    enablerCommission: number;
    platformFee: number;
    commissionRate: number;
    tierBonus: number;
    performanceBonus: number;
    sellerPaidAt?: Date | null;
    enablerPaidAt?: Date | null;
    settlementStatus: string;
    cancelledAt?: Date | null;
    cancellationReason?: string | null;
    disputeStatus: string;
    metadata?: Record<string, any> | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * EnablerOrder entity - Tracks enabler-facilitated orders
 */
export class EnablerOrderEntity {
    private constructor(private readonly props: EnablerOrderProps) { }

    static create(props: EnablerOrderProps): EnablerOrderEntity {
        return new EnablerOrderEntity(props);
    }

    // Getters
    get id(): string {
        return this.props.id;
    }

    get orderId(): string {
        return this.props.orderId;
    }

    get enablerId(): string {
        return this.props.enablerId;
    }

    get buyerId(): string {
        return this.props.buyerId;
    }

    get sellerId(): string {
        return this.props.sellerId;
    }

    get status(): Enabler_OrderStatus {
        return this.props.status;
    }

    get orderAmount(): number {
        return this.props.orderAmount;
    }

    get enablerCommission(): number {
        return this.props.enablerCommission;
    }

    get settlementStatus(): string {
        return this.props.settlementStatus;
    }

    // Business methods
    calculateCommissionBreakdown(): {
        baseCommission: number;
        tierBonus: number;
        performanceBonus: number;
        totalCommission: number;
        sellerPayout: number;
        platformFee: number;
    } {
        return {
            baseCommission: this.props.orderAmount * this.props.commissionRate,
            tierBonus: this.props.tierBonus,
            performanceBonus: this.props.performanceBonus,
            totalCommission: this.props.enablerCommission,
            sellerPayout: this.props.productAmount,
            platformFee: this.props.platformFee,
        };
    }

    validateInventoryAvailability(): boolean {
        // This would typically call inventory service
        // For now, return true if order is not cancelled
        return this.props.status !== Enabler_OrderStatus.CANCELLED;
    }

    canBeCancelled(): boolean {
        const cancellableStatuses: Enabler_OrderStatus[] = [
            Enabler_OrderStatus.PENDING,
            Enabler_OrderStatus.CONFIRMED,
        ];

        return cancellableStatuses.includes(this.props.status) && !this.props.cancelledAt;
    }

    canBeDisputed(): boolean {
        const disputeableStatuses: Enabler_OrderStatus[] = [
            Enabler_OrderStatus.CONFIRMED,
            Enabler_OrderStatus.PROCESSING,
            Enabler_OrderStatus.COMPLETED,
        ];

        return disputeableStatuses.includes(this.props.status) && this.props.disputeStatus === 'none';
    }

    isSettled(): boolean {
        return this.props.settlementStatus === 'completed' &&
            this.props.sellerPaidAt !== null &&
            this.props.enablerPaidAt !== null;
    }

    // State transitions
    confirm(): void {
        if (this.props.status !== Enabler_OrderStatus.PENDING) {
            throw new Error('Only pending orders can be confirmed');
        }
        this.props.status = Enabler_OrderStatus.CONFIRMED;
        this.props.updatedAt = new Date();
    }

    startProcessing(): void {
        if (this.props.status !== Enabler_OrderStatus.CONFIRMED) {
            throw new Error('Only confirmed orders can start processing');
        }
        this.props.status = Enabler_OrderStatus.PROCESSING;
        this.props.updatedAt = new Date();
    }

    complete(): void {
        if (this.props.status !== Enabler_OrderStatus.PROCESSING) {
            throw new Error('Only processing orders can be completed');
        }
        this.props.status = Enabler_OrderStatus.COMPLETED;
        this.props.updatedAt = new Date();
    }

    cancel(reason: string): void {
        if (!this.canBeCancelled()) {
            throw new Error('Order cannot be cancelled in current state');
        }
        this.props.status = Enabler_OrderStatus.CANCELLED;
        this.props.cancelledAt = new Date();
        this.props.cancellationReason = reason;
        this.props.updatedAt = new Date();
    }

    raiseDispute(reason: string): void {
        if (!this.canBeDisputed()) {
            throw new Error('Order cannot be disputed in current state');
        }
        this.props.status = Enabler_OrderStatus.DISPUTED;
        this.props.disputeStatus = 'raised';
        this.props.metadata = { ...this.props.metadata, disputeReason: reason };
        this.props.updatedAt = new Date();
    }

    resolveDispute(resolution: string): void {
        if (this.props.disputeStatus !== 'raised' && this.props.disputeStatus !== 'under_review') {
            throw new Error('No active dispute to resolve');
        }
        this.props.disputeStatus = 'resolved';
        this.props.metadata = { ...this.props.metadata, disputeResolution: resolution };
        this.props.updatedAt = new Date();
    }

    markSellerPaid(): void {
        this.props.sellerPaidAt = new Date();
        this.checkAndUpdateSettlementStatus();
    }

    markEnablerPaid(): void {
        this.props.enablerPaidAt = new Date();
        this.checkAndUpdateSettlementStatus();
    }

    private checkAndUpdateSettlementStatus(): void {
        if (this.props.sellerPaidAt && this.props.enablerPaidAt) {
            this.props.settlementStatus = 'completed';
        } else if (this.props.sellerPaidAt || this.props.enablerPaidAt) {
            this.props.settlementStatus = 'processing';
        }
    }

    toPlainObject(): EnablerOrderProps {
        return { ...this.props };
    }
}
