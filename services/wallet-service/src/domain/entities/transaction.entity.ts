import { AuditInfo, ActorType } from '../value-objects/audit-info.value-object';

/**
 * Transaction Entity
 * Immutable append-only ledger entry for wallet transactions
 * Ensures balance consistency and transaction traceability
 */

export enum TransactionType {
    CREDIT = 'CREDIT',
    DEBIT = 'DEBIT',
    FREEZE = 'FREEZE',
    UNFREEZE = 'UNFREEZE',
    DEBIT_FROZEN = 'DEBIT_FROZEN',
    REFUND = 'REFUND',
    PAYOUT = 'PAYOUT',
    TRANSFER_IN = 'TRANSFER_IN',
    TRANSFER_OUT = 'TRANSFER_OUT',
}

export interface TransactionProps {
    id: string;
    walletId: string;
    paymentId?: string;
    refundId?: string;
    payoutId?: string;
    userId: string;
    type: TransactionType;
    amount: number;
    currency: string;
    balanceBefore: number;
    balanceAfter: number;
    frozenAmountBefore: number;
    frozenAmountAfter: number;
    referenceType?: string;
    referenceId?: string;
    description: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    // New fields
    correlationId: string;
    idempotencyKey?: string;
    initiatedBy: string;
    initiatedByType: ActorType;
    reason: string;
    reversalTransactionId?: string;
    isReversed: boolean;
    expiresAt?: Date;
    // COD Tracking
    isCODRelated: boolean;
    codOrderId?: string;
    codConfirmationRequired: boolean;
    codConfirmedAt?: Date;
}

export class Transaction {
    private readonly props: TransactionProps;

    constructor(props: TransactionProps) {
        this.validateProps(props);
        this.validateBalanceConsistency(props);
        // Make props immutable by freezing
        this.props = Object.freeze({ ...props });
    }

    // Getters
    get id(): string {
        return this.props.id;
    }

    get walletId(): string {
        return this.props.walletId;
    }

    get paymentId(): string | undefined {
        return this.props.paymentId;
    }

    get refundId(): string | undefined {
        return this.props.refundId;
    }

    get payoutId(): string | undefined {
        return this.props.payoutId;
    }

    get userId(): string {
        return this.props.userId;
    }

    get type(): TransactionType {
        return this.props.type;
    }

    get amount(): number {
        return this.props.amount;
    }

    get balanceBefore(): number {
        return this.props.balanceBefore;
    }

    get balanceAfter(): number {
        return this.props.balanceAfter;
    }

    get frozenAmountBefore(): number {
        return this.props.frozenAmountBefore;
    }

    get frozenAmountAfter(): number {
        return this.props.frozenAmountAfter;
    }

    get description(): string {
        return this.props.description;
    }

    get metadata(): Record<string, unknown> | undefined {
        return this.props.metadata ? { ...this.props.metadata } : undefined;
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    get currency(): string {
        return this.props.currency;
    }

    get correlationId(): string {
        return this.props.correlationId;
    }

    get idempotencyKey(): string | undefined {
        return this.props.idempotencyKey;
    }

    get initiatedBy(): string {
        return this.props.initiatedBy;
    }

    get initiatedByType(): ActorType {
        return this.props.initiatedByType;
    }

    get reason(): string {
        return this.props.reason;
    }

    get reversalTransactionId(): string | undefined {
        return this.props.reversalTransactionId;
    }

    get isReversed(): boolean {
        return this.props.isReversed;
    }

    get expiresAt(): Date | undefined {
        return this.props.expiresAt;
    }

    get referenceType(): string | undefined {
        return this.props.referenceType;
    }

    get referenceId(): string | undefined {
        return this.props.referenceId;
    }

    get isCODRelated(): boolean {
        return this.props.isCODRelated;
    }

    get codOrderId(): string | undefined {
        return this.props.codOrderId;
    }

    get codConfirmationRequired(): boolean {
        return this.props.codConfirmationRequired;
    }

    get codConfirmedAt(): Date | undefined {
        return this.props.codConfirmedAt;
    }

    // Business Methods

    /**
     * Check if transaction is reversible
     */
    isReversible(): boolean {
        // Only certain transaction types can be reversed
        const reversibleTypes = [
            TransactionType.CREDIT,
            TransactionType.DEBIT,
            TransactionType.FREEZE,
            TransactionType.TRANSFER_IN,
            TransactionType.TRANSFER_OUT,
        ];

        return reversibleTypes.includes(this.props.type);
    }

    /**
     * Check if hold has expired
     */
    isExpired(): boolean {
        if (!this.props.expiresAt) return false;
        return new Date() > this.props.expiresAt;
    }

    /**
     * Get audit trail info
     */
    getAuditTrail(): AuditInfo {
        // Reconstruct audit info from props
        // Ideally this would be stored as a value object, but we are flattening for database
        // Here we reconstruct it for domain logic if needed
        return Object.assign(Object.create(AuditInfo.prototype), {
            props: {
                actor: this.props.initiatedBy,
                actorType: this.props.initiatedByType,
                action: this.props.type,
                reason: this.props.reason,
                timestamp: this.props.createdAt,
                metadata: this.props.metadata
            }
        });
    }

    /**
     * Create a reversal transaction
     */
    createReversal(reversalId: string, reason: string): Transaction {
        if (!this.isReversible()) {
            throw new Error(`Transaction type ${this.props.type} cannot be reversed`);
        }

        const reversalType = this.getReversalType();
        const reversalProps: TransactionProps = {
            id: reversalId,
            walletId: this.props.walletId,
            userId: this.props.userId,
            type: reversalType,
            amount: this.props.amount,
            currency: this.props.currency,
            balanceBefore: this.props.balanceAfter,
            balanceAfter: this.props.balanceBefore,
            frozenAmountBefore: this.props.frozenAmountAfter,
            frozenAmountAfter: this.props.frozenAmountBefore,
            referenceType: 'TRANSACTION',
            referenceId: this.props.id,
            description: `Reversal: ${reason}`,
            metadata: {
                originalTransactionId: this.props.id,
                reversalReason: reason,
            },
            createdAt: new Date(),
            correlationId: this.props.correlationId, // Propagate correlation ID
            initiatedBy: this.props.initiatedBy, // Or current user? Typically same actor, or admin
            initiatedByType: this.props.initiatedByType,
            reason: `REVERSAL_OF_${this.props.id}`,
            isReversed: false, // Usage of this flag on a reversal transaction itself? Usually false.
            reversalTransactionId: undefined, // This is the reversal, not reversed by another
            // COD Tracking
            isCODRelated: this.props.isCODRelated,
            codOrderId: this.props.codOrderId,
            codConfirmationRequired: false, // Reversals don't usually require COD confirm themselves
            codConfirmedAt: undefined,
        };

        return new Transaction(reversalProps);
    }

    /**
     * Get the reversal transaction type
     */
    private getReversalType(): TransactionType {
        switch (this.props.type) {
            case TransactionType.CREDIT:
                return TransactionType.DEBIT;
            case TransactionType.DEBIT:
                return TransactionType.CREDIT;
            case TransactionType.FREEZE:
                return TransactionType.UNFREEZE;
            case TransactionType.TRANSFER_IN:
                return TransactionType.TRANSFER_OUT;
            case TransactionType.TRANSFER_OUT:
                return TransactionType.TRANSFER_IN;
            default:
                throw new Error(`No reversal type defined for ${this.props.type}`);
        }
    }

    /**
     * Validate transaction
     */
    validate(): boolean {
        try {
            this.validateProps(this.props);
            this.validateBalanceConsistency(this.props);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate balance consistency based on transaction type
     */
    private validateBalanceConsistency(props: TransactionProps): void {
        const tolerance = 0.01; // Allow small floating point differences

        switch (props.type) {
            case TransactionType.CREDIT:
            case TransactionType.TRANSFER_IN:
            case TransactionType.REFUND: {
                // Balance should increase by amount
                const expectedBalanceAfterCredit = props.balanceBefore + props.amount;
                if (Math.abs(props.balanceAfter - expectedBalanceAfterCredit) > tolerance) {
                    throw new Error(
                        `Invalid balance for CREDIT: expected ${expectedBalanceAfterCredit}, got ${props.balanceAfter}`
                    );
                }
                break;
            }

            case TransactionType.DEBIT:
            case TransactionType.TRANSFER_OUT:
            case TransactionType.PAYOUT: {
                // Balance should decrease by amount
                const expectedBalanceAfterDebit = props.balanceBefore - props.amount;
                if (Math.abs(props.balanceAfter - expectedBalanceAfterDebit) > tolerance) {
                    throw new Error(
                        `Invalid balance for DEBIT: expected ${expectedBalanceAfterDebit}, got ${props.balanceAfter}`
                    );
                }
                break;
            }

            case TransactionType.FREEZE: {
                // Balance stays same, frozen amount increases
                if (Math.abs(props.balanceAfter - props.balanceBefore) > tolerance) {
                    throw new Error('Balance should not change for FREEZE');
                }
                const expectedFrozenAfterFreeze = props.frozenAmountBefore + props.amount;
                if (Math.abs(props.frozenAmountAfter - expectedFrozenAfterFreeze) > tolerance) {
                    throw new Error(
                        `Invalid frozen amount for FREEZE: expected ${expectedFrozenAfterFreeze}, got ${props.frozenAmountAfter}`
                    );
                }
                break;
            }

            case TransactionType.UNFREEZE: {
                // Balance stays same, frozen amount decreases
                if (Math.abs(props.balanceAfter - props.balanceBefore) > tolerance) {
                    throw new Error('Balance should not change for UNFREEZE');
                }
                const expectedFrozenAfterUnfreeze = props.frozenAmountBefore - props.amount;
                if (Math.abs(props.frozenAmountAfter - expectedFrozenAfterUnfreeze) > tolerance) {
                    throw new Error(
                        `Invalid frozen amount for UNFREEZE: expected ${expectedFrozenAfterUnfreeze}, got ${props.frozenAmountAfter}`
                    );
                }
                break;
            }

            case TransactionType.DEBIT_FROZEN: {
                // Both balance and frozen amount decrease
                const expectedBalanceAfterDebitFrozen = props.balanceBefore - props.amount;
                const expectedFrozenAfterDebitFrozen = props.frozenAmountBefore - props.amount;
                if (Math.abs(props.balanceAfter - expectedBalanceAfterDebitFrozen) > tolerance) {
                    throw new Error(
                        `Invalid balance for DEBIT_FROZEN: expected ${expectedBalanceAfterDebitFrozen}, got ${props.balanceAfter}`
                    );
                }
                if (Math.abs(props.frozenAmountAfter - expectedFrozenAfterDebitFrozen) > tolerance) {
                    throw new Error(
                        `Invalid frozen amount for DEBIT_FROZEN: expected ${expectedFrozenAfterDebitFrozen}, got ${props.frozenAmountAfter}`
                    );
                }
                break;
            }
        }
    }

    /**
     * Validate transaction props
     */
    private validateProps(props: TransactionProps): void {
        if (!props.id || props.id.trim() === '') {
            throw new Error('Transaction ID is required');
        }

        if (!props.walletId || props.walletId.trim() === '') {
            throw new Error('Wallet ID is required');
        }

        if (!props.userId || props.userId.trim() === '') {
            throw new Error('User ID is required');
        }

        if (!Object.values(TransactionType).includes(props.type)) {
            throw new Error(`Invalid transaction type: ${props.type}`);
        }

        if (props.amount <= 0) {
            throw new Error('Transaction amount must be positive');
        }

        if (props.balanceBefore < 0) {
            throw new Error('Balance before cannot be negative');
        }

        if (props.balanceAfter < 0) {
            throw new Error('Balance after cannot be negative');
        }

        if (props.frozenAmountBefore < 0) {
            throw new Error('Frozen amount before cannot be negative');
        }

        if (props.frozenAmountAfter < 0) {
            throw new Error('Frozen amount after cannot be negative');
        }

        if (!props.description || props.description.trim() === '') {
            throw new Error('Transaction description is required');
        }

        // New field validation
        if (!props.correlationId || props.correlationId.trim() === '') {
            throw new Error('Correlation ID is required');
        }

        if (!props.initiatedBy || props.initiatedBy.trim() === '') {
            throw new Error('Initiated By is required');
        }

        if (!props.initiatedByType) {
            throw new Error('Initiated By Type is required');
        }

        if (!props.reason || props.reason.trim() === '') {
            throw new Error('Reason is required');
        }
    }

    /**
     * Create a snapshot of the transaction
     */
    toObject(): TransactionProps {
        return { ...this.props };
    }
}
