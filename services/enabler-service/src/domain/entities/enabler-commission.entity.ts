export interface EnablerCommissionProps {
    id: string;
    enablerId: string;
    enablerOrderId: string;
    commissionId?: string | null;
    baseCommission: number;
    tierBonus: number;
    performanceBonus: number;
    totalCommission: number;
    status: string;
    approvedBy?: string | null;
    approvedAt?: Date | null;
    holdUntil?: Date | null;
    protectionStatus: string;
    fraudCheckStatus: string;
    payoutId?: string | null;
    paidAt?: Date | null;
    paymentMethod?: string | null;
    calculationDetails?: Record<string, any> | null;
    metadata?: Record<string, any> | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * EnablerCommission entity - Tracks commission records
 */
export class EnablerCommissionEntity {
    private constructor(private readonly props: EnablerCommissionProps) { }

    static create(props: EnablerCommissionProps): EnablerCommissionEntity {
        return new EnablerCommissionEntity(props);
    }

    // Getters
    get id(): string {
        return this.props.id;
    }

    get enablerId(): string {
        return this.props.enablerId;
    }

    get totalCommission(): number {
        return this.props.totalCommission;
    }

    get status(): string {
        return this.props.status;
    }

    get holdUntil(): Date | null | undefined {
        return this.props.holdUntil;
    }

    get isPaid(): boolean {
        return this.props.status === 'paid' && this.props.paidAt !== null;
    }

    get isApproved(): boolean {
        return this.props.status === 'approved' || this.props.status === 'paid';
    }

    get isOnHold(): boolean {
        if (!this.props.holdUntil) return false;
        return new Date() < this.props.holdUntil;
    }

    // Business methods
    canBeApproved(): boolean {
        return this.props.status === 'pending' &&
            this.props.fraudCheckStatus === 'cleared' &&
            !this.isOnHold;
    }

    canBePaid(): boolean {
        return this.props.status === 'approved' &&
            !this.isOnHold &&
            this.props.fraudCheckStatus === 'cleared';
    }

    calculateHoldPeriod(): Date {
        // Default 7-day hold period
        const holdDays = 7;
        const holdDate = new Date();
        holdDate.setDate(holdDate.getDate() + holdDays);
        return holdDate;
    }

    // State transitions
    approve(approvedBy: string): void {
        if (!this.canBeApproved()) {
            throw new Error('Commission cannot be approved in current state');
        }
        this.props.status = 'approved';
        this.props.approvedBy = approvedBy;
        this.props.approvedAt = new Date();
        this.props.updatedAt = new Date();
    }

    putOnHold(reason: string, holdDays: number = 7): void {
        const holdDate = new Date();
        holdDate.setDate(holdDate.getDate() + holdDays);

        this.props.status = 'on_hold';
        this.props.holdUntil = holdDate;
        this.props.metadata = { ...this.props.metadata, holdReason: reason };
        this.props.updatedAt = new Date();
    }

    releaseHold(): void {
        if (this.props.status !== 'on_hold') {
            throw new Error('Commission is not on hold');
        }
        this.props.status = 'approved';
        this.props.holdUntil = null;
        this.props.updatedAt = new Date();
    }

    clearFraudCheck(): void {
        this.props.fraudCheckStatus = 'cleared';
        this.props.updatedAt = new Date();
    }

    flagForFraud(reason: string): void {
        this.props.fraudCheckStatus = 'flagged';
        this.props.status = 'on_hold';
        this.props.metadata = { ...this.props.metadata, fraudReason: reason };
        this.props.updatedAt = new Date();
    }

    markAsPaid(payoutId: string, paymentMethod: string): void {
        if (!this.canBePaid()) {
            throw new Error('Commission cannot be paid in current state');
        }
        this.props.status = 'paid';
        this.props.payoutId = payoutId;
        this.props.paidAt = new Date();
        this.props.paymentMethod = paymentMethod;
        this.props.updatedAt = new Date();
    }

    raiseDispute(reason: string): void {
        if (this.props.status === 'paid') {
            throw new Error('Cannot dispute a paid commission');
        }
        this.props.status = 'disputed';
        this.props.metadata = { ...this.props.metadata, disputeReason: reason };
        this.props.updatedAt = new Date();
    }

    forfeit(reason: string): void {
        this.props.status = 'forfeited';
        this.props.protectionStatus = 'forfeited';
        this.props.metadata = { ...this.props.metadata, forfeitureReason: reason };
        this.props.updatedAt = new Date();
    }

    getBreakdown(): {
        baseCommission: number;
        tierBonus: number;
        performanceBonus: number;
        totalCommission: number;
    } {
        return {
            baseCommission: this.props.baseCommission,
            tierBonus: this.props.tierBonus,
            performanceBonus: this.props.performanceBonus,
            totalCommission: this.props.totalCommission,
        };
    }

    toPlainObject(): EnablerCommissionProps {
        return { ...this.props };
    }
}
