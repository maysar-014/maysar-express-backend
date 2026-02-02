/**
 * Refund Entity
 * Pure business entity representing a payment refund
 * Enforces refund business rules and status transitions
 */

export enum RefundStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
}

export enum RefundReason {
    CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
    ORDER_CANCELLED = 'ORDER_CANCELLED',
    DUPLICATE_PAYMENT = 'DUPLICATE_PAYMENT',
    FRAUDULENT_TRANSACTION = 'FRAUDULENT_TRANSACTION',
    PRODUCT_NOT_DELIVERED = 'PRODUCT_NOT_DELIVERED',
    PRODUCT_DEFECTIVE = 'PRODUCT_DEFECTIVE',
    SELLER_REQUEST = 'SELLER_REQUEST',
    ADMIN_DECISION = 'ADMIN_DECISION',
    OTHER = 'OTHER',
}

export interface RefundProps {
    id: string;
    paymentId: string;
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    reason: RefundReason;
    reasonDetails?: string;
    status: RefundStatus;
    providerRef?: string;
    failureReason?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    processedAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
}

export class Refund {
    private props: RefundProps;

    constructor(props: RefundProps) {
        this.validateProps(props);
        this.props = { ...props };
    }

    // Getters
    get id(): string {
        return this.props.id;
    }

    get paymentId(): string {
        return this.props.paymentId;
    }

    get orderId(): string {
        return this.props.orderId;
    }

    get userId(): string {
        return this.props.userId;
    }

    get amount(): number {
        return this.props.amount;
    }

    get currency(): string {
        return this.props.currency;
    }

    get reason(): RefundReason {
        return this.props.reason;
    }

    get reasonDetails(): string | undefined {
        return this.props.reasonDetails;
    }

    get status(): RefundStatus {
        return this.props.status;
    }

    get providerRef(): string | undefined {
        return this.props.providerRef;
    }

    get failureReason(): string | undefined {
        return this.props.failureReason;
    }

    get metadata(): Record<string, any> | undefined {
        return this.props.metadata ? { ...this.props.metadata } : undefined;
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    get updatedAt(): Date {
        return this.props.updatedAt;
    }

    get processedAt(): Date | undefined {
        return this.props.processedAt;
    }

    get completedAt(): Date | undefined {
        return this.props.completedAt;
    }

    get failedAt(): Date | undefined {
        return this.props.failedAt;
    }

    // Business Methods

    /**
     * Check if refund can be processed
     */
    canProcess(): boolean {
        return this.props.status === RefundStatus.PENDING;
    }

    /**
     * Start processing the refund
     */
    process(): void {
        if (!this.canProcess()) {
            throw new Error(`Cannot process refund in ${this.props.status} status`);
        }

        this.props.status = RefundStatus.PROCESSING;
        this.props.processedAt = new Date();
        this.props.updatedAt = new Date();
    }

    /**
     * Mark refund as completed
     */
    complete(providerRefundId?: string): void {
        if (this.props.status !== RefundStatus.PROCESSING) {
            throw new Error(
                `Cannot complete refund in ${this.props.status} status. Must be PROCESSING.`
            );
        }

        this.props.status = RefundStatus.COMPLETED;
        this.props.completedAt = new Date();
        this.props.updatedAt = new Date();

        if (providerRefundId) {
            this.props.providerRef = providerRefundId;
        }
    }

    /**
     * Mark refund as failed
     */
    fail(reason: string): void {
        if (
            this.props.status !== RefundStatus.PENDING &&
            this.props.status !== RefundStatus.PROCESSING
        ) {
            throw new Error(`Cannot fail refund in ${this.props.status} status`);
        }

        this.props.status = RefundStatus.FAILED;
        this.props.failureReason = reason;
        this.props.updatedAt = new Date();
    }

    /**
     * Cancel refund
     */
    cancel(): void {
        if (
            this.props.status !== RefundStatus.PENDING &&
            this.props.status !== RefundStatus.PROCESSING
        ) {
            throw new Error(`Cannot cancel refund in ${this.props.status} status`);
        }

        this.props.status = RefundStatus.CANCELLED;
        this.props.updatedAt = new Date();
    }

    /**
     * Update status
     */
    updateStatus(newStatus: RefundStatus, reason?: string): void {
        this.validateStatusTransition(this.props.status, newStatus);
        this.props.status = newStatus;
        this.props.updatedAt = new Date();

        if (newStatus === RefundStatus.FAILED && reason) {
            this.props.failureReason = reason;
        }

        if (newStatus === RefundStatus.PROCESSING && !this.props.processedAt) {
            this.props.processedAt = new Date();
        }

        if (newStatus === RefundStatus.COMPLETED && !this.props.completedAt) {
            this.props.completedAt = new Date();
        }
    }

    /**
     * Validate status transition
     */
    private validateStatusTransition(
        currentStatus: RefundStatus,
        newStatus: RefundStatus
    ): void {
        const validTransitions: Record<RefundStatus, RefundStatus[]> = {
            [RefundStatus.PENDING]: [
                RefundStatus.PROCESSING,
                RefundStatus.FAILED,
                RefundStatus.CANCELLED,
            ],
            [RefundStatus.PROCESSING]: [
                RefundStatus.COMPLETED,
                RefundStatus.FAILED,
                RefundStatus.CANCELLED,
            ],
            [RefundStatus.COMPLETED]: [],
            [RefundStatus.FAILED]: [],
            [RefundStatus.CANCELLED]: [],
        };

        const allowedTransitions = validTransitions[currentStatus];
        if (!allowedTransitions.includes(newStatus)) {
            throw new Error(
                `Invalid status transition from ${currentStatus} to ${newStatus}`
            );
        }
    }

    /**
     * Validate refund props
     */
    private validateProps(props: RefundProps): void {
        if (!props.id || props.id.trim() === '') {
            throw new Error('Refund ID is required');
        }

        if (!props.paymentId || props.paymentId.trim() === '') {
            throw new Error('Payment ID is required');
        }

        if (!props.orderId || props.orderId.trim() === '') {
            throw new Error('Order ID is required');
        }

        if (!props.userId || props.userId.trim() === '') {
            throw new Error('User ID is required');
        }

        if (props.amount <= 0) {
            throw new Error('Refund amount must be positive');
        }

        if (!props.currency || props.currency.trim() === '') {
            throw new Error('Currency is required');
        }

        if (!Object.values(RefundReason).includes(props.reason)) {
            throw new Error(`Invalid refund reason: ${props.reason}`);
        }

        if (!Object.values(RefundStatus).includes(props.status)) {
            throw new Error(`Invalid refund status: ${props.status}`);
        }
    }

    /**
     * Create a snapshot of the refund
     */
    toObject(): RefundProps {
        return { ...this.props };
    }
}
