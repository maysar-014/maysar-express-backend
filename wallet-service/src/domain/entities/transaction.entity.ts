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
    metadata?: Record<string, any>;
    createdAt: Date;
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

    get metadata(): Record<string, any> | undefined {
        return this.props.metadata ? { ...this.props.metadata } : undefined;
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    get currency(): string {
        return this.props.currency;
    }

    get referenceType(): string | undefined {
        return this.props.referenceType;
    }

    get referenceId(): string | undefined {
        return this.props.referenceId;
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
            case TransactionType.REFUND:
                // Balance should increase by amount
                const expectedBalanceAfterCredit = props.balanceBefore + props.amount;
                if (Math.abs(props.balanceAfter - expectedBalanceAfterCredit) > tolerance) {
                    throw new Error(
                        `Invalid balance for CREDIT: expected ${expectedBalanceAfterCredit}, got ${props.balanceAfter}`
                    );
                }
                break;

            case TransactionType.DEBIT:
            case TransactionType.TRANSFER_OUT:
            case TransactionType.PAYOUT:
                // Balance should decrease by amount
                const expectedBalanceAfterDebit = props.balanceBefore - props.amount;
                if (Math.abs(props.balanceAfter - expectedBalanceAfterDebit) > tolerance) {
                    throw new Error(
                        `Invalid balance for DEBIT: expected ${expectedBalanceAfterDebit}, got ${props.balanceAfter}`
                    );
                }
                break;

            case TransactionType.FREEZE:
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

            case TransactionType.UNFREEZE:
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

            case TransactionType.DEBIT_FROZEN:
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
    }

    /**
     * Create a snapshot of the transaction
     */
    toObject(): TransactionProps {
        return { ...this.props };
    }
}
