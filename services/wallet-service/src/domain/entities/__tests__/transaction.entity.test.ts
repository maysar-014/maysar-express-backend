import { Transaction, TransactionType, TransactionProps } from '../transaction.entity';
import { ActorType } from '../../value-objects/audit-info.value-object';

describe('Transaction Entity', () => {
    const createTransactionProps = (overrides: Partial<TransactionProps> = {}): TransactionProps => ({
        id: 'txn-123',
        walletId: 'wallet-456',
        userId: 'user-789',
        type: TransactionType.CREDIT,
        amount: 1000,
        currency: 'TZS',
        balanceBefore: 5000,
        balanceAfter: 6000,
        frozenAmountBefore: 0,
        frozenAmountAfter: 0,
        description: 'Test transaction',
        createdAt: new Date('2024-01-01'),
        correlationId: 'corr-123',
        initiatedBy: 'user-789',
        initiatedByType: ActorType.USER,
        reason: 'TEST_CREDIT',
        isReversed: false,
        isCODRelated: false,
        codConfirmationRequired: false,
        ...overrides,
    });

    describe('Creation and Validation', () => {
        it('should create a valid transaction with required fields', () => {
            const props = createTransactionProps();
            const transaction = new Transaction(props);

            expect(transaction.id).toBe('txn-123');
            expect(transaction.walletId).toBe('wallet-456');
            expect(transaction.userId).toBe('user-789');
            expect(transaction.type).toBe(TransactionType.CREDIT);
            expect(transaction.amount).toBe(1000);
            expect(transaction.balanceBefore).toBe(5000);
            expect(transaction.balanceAfter).toBe(6000);
        });

        it('should throw error when ID is missing', () => {
            const props = createTransactionProps({ id: '' });
            expect(() => new Transaction(props)).toThrow('Transaction ID is required');
        });

        it('should throw error when walletId is missing', () => {
            const props = createTransactionProps({ walletId: '' });
            expect(() => new Transaction(props)).toThrow('Wallet ID is required');
        });

        it('should throw error when userId is missing', () => {
            const props = createTransactionProps({ userId: '' });
            expect(() => new Transaction(props)).toThrow('User ID is required');
        });

        it('should throw error for invalid transaction type', () => {
            const props = createTransactionProps({ type: 'INVALID' as TransactionType });
            expect(() => new Transaction(props)).toThrow('Invalid transaction type');
        });

        it('should throw error for zero or negative amount', () => {
            expect(() => new Transaction(createTransactionProps({ amount: 0 }))).toThrow('Transaction amount must be positive');
            expect(() => new Transaction(createTransactionProps({ amount: -100 }))).toThrow('Transaction amount must be positive');
        });

        it('should throw error for negative balance before', () => {
            const props = createTransactionProps({ balanceBefore: -100 });
            expect(() => new Transaction(props)).toThrow('Balance before cannot be negative');
        });

        it('should throw error for negative balance after', () => {
            const props = createTransactionProps({ balanceAfter: -100 });
            expect(() => new Transaction(props)).toThrow('Balance after cannot be negative');
        });

        it('should throw error when description is missing', () => {
            const props = createTransactionProps({ description: '' });
            expect(() => new Transaction(props)).toThrow('Transaction description is required');
        });

        it('should throw error when correlationId is missing', () => {
            const props = createTransactionProps({ correlationId: '' });
            expect(() => new Transaction(props)).toThrow('Correlation ID is required');
        });

        it('should throw error when initiatedBy is missing', () => {
            const props = createTransactionProps({ initiatedBy: '' });
            expect(() => new Transaction(props)).toThrow('Initiated By is required');
        });

        it('should throw error when reason is missing', () => {
            const props = createTransactionProps({ reason: '' });
            expect(() => new Transaction(props)).toThrow('Reason is required');
        });
    });

    describe('Balance Consistency - CREDIT', () => {
        it('should validate CREDIT balance increase', () => {
            const props = createTransactionProps({
                type: TransactionType.CREDIT,
                amount: 1000,
                balanceBefore: 5000,
                balanceAfter: 6000,
            });
            expect(() => new Transaction(props)).not.toThrow();
        });

        it('should throw error for invalid CREDIT balance', () => {
            const props = createTransactionProps({
                type: TransactionType.CREDIT,
                amount: 1000,
                balanceBefore: 5000,
                balanceAfter: 5500, // Should be 6000
            });
            expect(() => new Transaction(props)).toThrow('Invalid balance for CREDIT');
        });
    });

    describe('Balance Consistency - DEBIT', () => {
        it('should validate DEBIT balance decrease', () => {
            const props = createTransactionProps({
                type: TransactionType.DEBIT,
                amount: 1000,
                balanceBefore: 5000,
                balanceAfter: 4000,
            });
            expect(() => new Transaction(props)).not.toThrow();
        });

        it('should throw error for invalid DEBIT balance', () => {
            const props = createTransactionProps({
                type: TransactionType.DEBIT,
                amount: 1000,
                balanceBefore: 5000,
                balanceAfter: 4500, // Should be 4000
            });
            expect(() => new Transaction(props)).toThrow('Invalid balance for DEBIT');
        });
    });

    describe('Balance Consistency - FREEZE', () => {
        it('should validate FREEZE frozen amount increase', () => {
            const props = createTransactionProps({
                type: TransactionType.FREEZE,
                amount: 1000,
                balanceBefore: 5000,
                balanceAfter: 5000,
                frozenAmountBefore: 0,
                frozenAmountAfter: 1000,
            });
            expect(() => new Transaction(props)).not.toThrow();
        });

        it('should throw error when balance changes for FREEZE', () => {
            const props = createTransactionProps({
                type: TransactionType.FREEZE,
                amount: 1000,
                balanceBefore: 5000,
                balanceAfter: 4000, // Should remain 5000
                frozenAmountBefore: 0,
                frozenAmountAfter: 1000,
            });
            expect(() => new Transaction(props)).toThrow('Balance should not change for FREEZE');
        });

        it('should throw error for invalid frozen amount in FREEZE', () => {
            const props = createTransactionProps({
                type: TransactionType.FREEZE,
                amount: 1000,
                balanceBefore: 5000,
                balanceAfter: 5000,
                frozenAmountBefore: 0,
                frozenAmountAfter: 500, // Should be 1000
            });
            expect(() => new Transaction(props)).toThrow('Invalid frozen amount for FREEZE');
        });
    });

    describe('Balance Consistency - UNFREEZE', () => {
        it('should validate UNFREEZE frozen amount decrease', () => {
            const props = createTransactionProps({
                type: TransactionType.UNFREEZE,
                amount: 500,
                balanceBefore: 5000,
                balanceAfter: 5000,
                frozenAmountBefore: 1000,
                frozenAmountAfter: 500,
            });
            expect(() => new Transaction(props)).not.toThrow();
        });

        it('should throw error when balance changes for UNFREEZE', () => {
            const props = createTransactionProps({
                type: TransactionType.UNFREEZE,
                amount: 500,
                balanceBefore: 5000,
                balanceAfter: 5500, // Should remain 5000
                frozenAmountBefore: 1000,
                frozenAmountAfter: 500,
            });
            expect(() => new Transaction(props)).toThrow('Balance should not change for UNFREEZE');
        });
    });

    describe('Balance Consistency - DEBIT_FROZEN', () => {
        it('should validate DEBIT_FROZEN both amounts decrease', () => {
            const props = createTransactionProps({
                type: TransactionType.DEBIT_FROZEN,
                amount: 1000,
                balanceBefore: 5000,
                balanceAfter: 4000,
                frozenAmountBefore: 2000,
                frozenAmountAfter: 1000,
            });
            expect(() => new Transaction(props)).not.toThrow();
        });

        it('should throw error for invalid balance in DEBIT_FROZEN', () => {
            const props = createTransactionProps({
                type: TransactionType.DEBIT_FROZEN,
                amount: 1000,
                balanceBefore: 5000,
                balanceAfter: 4500, // Should be 4000
                frozenAmountBefore: 2000,
                frozenAmountAfter: 1000,
            });
            expect(() => new Transaction(props)).toThrow('Invalid balance for DEBIT_FROZEN');
        });
    });

    describe('Reversibility', () => {
        it('should identify reversible transaction types', () => {
            const creditTxn = new Transaction(createTransactionProps({ type: TransactionType.CREDIT }));
            const debitTxn = new Transaction(createTransactionProps({
                type: TransactionType.DEBIT,
                balanceBefore: 5000,
                balanceAfter: 4000,
            }));
            const freezeTxn = new Transaction(createTransactionProps({
                type: TransactionType.FREEZE,
                balanceBefore: 5000,
                balanceAfter: 5000,
                frozenAmountBefore: 0,
                frozenAmountAfter: 1000,
            }));

            expect(creditTxn.isReversible()).toBe(true);
            expect(debitTxn.isReversible()).toBe(true);
            expect(freezeTxn.isReversible()).toBe(true);
        });

        it('should identify non-reversible transaction types', () => {
            const unfreezeProps = createTransactionProps({
                type: TransactionType.UNFREEZE,
                balanceBefore: 5000,
                balanceAfter: 5000,
                frozenAmountBefore: 1000,
                frozenAmountAfter: 0,
            });
            const unfreezeTxn = new Transaction(unfreezeProps);

            expect(unfreezeTxn.isReversible()).toBe(false);
        });
    });

    describe('Create Reversal', () => {
        it('should create reversal for CREDIT transaction', () => {
            const creditTxn = new Transaction(createTransactionProps({
                type: TransactionType.CREDIT,
                amount: 1000,
                balanceBefore: 5000,
                balanceAfter: 6000,
            }));

            const reversal = creditTxn.createReversal('rev-123', 'Customer refund');

            expect(reversal.type).toBe(TransactionType.DEBIT);
            expect(reversal.amount).toBe(1000);
            expect(reversal.balanceBefore).toBe(6000);
            expect(reversal.balanceAfter).toBe(5000);
            expect(reversal.description).toContain('Reversal');
        });

        it('should create reversal for DEBIT transaction', () => {
            const debitTxn = new Transaction(createTransactionProps({
                type: TransactionType.DEBIT,
                amount: 1000,
                balanceBefore: 5000,
                balanceAfter: 4000,
            }));

            const reversal = debitTxn.createReversal('rev-123', 'Refund');

            expect(reversal.type).toBe(TransactionType.CREDIT);
            expect(reversal.balanceBefore).toBe(4000);
            expect(reversal.balanceAfter).toBe(5000);
        });

        it('should create reversal for FREEZE transaction', () => {
            const freezeTxn = new Transaction(createTransactionProps({
                type: TransactionType.FREEZE,
                amount: 1000,
                balanceBefore: 5000,
                balanceAfter: 5000,
                frozenAmountBefore: 0,
                frozenAmountAfter: 1000,
            }));

            const reversal = freezeTxn.createReversal('rev-123', 'Hold cancelled');

            expect(reversal.type).toBe(TransactionType.UNFREEZE);
            expect(reversal.frozenAmountBefore).toBe(1000);
            expect(reversal.frozenAmountAfter).toBe(0);
        });

        it('should throw error for non-reversible transaction', () => {
            const unfreezeTxn = new Transaction(createTransactionProps({
                type: TransactionType.UNFREEZE,
                balanceBefore: 5000,
                balanceAfter: 5000,
                frozenAmountBefore: 1000,
                frozenAmountAfter: 0,
            }));

            expect(() => unfreezeTxn.createReversal('rev-123', 'test')).toThrow('cannot be reversed');
        });

        it('should propagate correlationId to reversal', () => {
            const txn = new Transaction(createTransactionProps({ correlationId: 'corr-original' }));
            const reversal = txn.createReversal('rev-123', 'test');

            expect(reversal.correlationId).toBe('corr-original');
        });
    });

    describe('Expiration', () => {
        it('should return false when no expiry date', () => {
            const txn = new Transaction(createTransactionProps({ expiresAt: undefined }));
            expect(txn.isExpired()).toBe(false);
        });

        it('should return false when expiry is in future', () => {
            const futureDate = new Date(Date.now() + 86400000);
            const txn = new Transaction(createTransactionProps({ expiresAt: futureDate }));
            expect(txn.isExpired()).toBe(false);
        });

        it('should return true when expiry is in past', () => {
            const pastDate = new Date(Date.now() - 86400000);
            const txn = new Transaction(createTransactionProps({ expiresAt: pastDate }));
            expect(txn.isExpired()).toBe(true);
        });
    });

    describe('Audit Trail', () => {
        it('should return audit info', () => {
            const txn = new Transaction(createTransactionProps({
                initiatedBy: 'admin-123',
                initiatedByType: ActorType.ADMIN,
                reason: 'ADMIN_ADJUSTMENT',
            }));

            const auditInfo = txn.getAuditTrail();

            expect(auditInfo.actor).toBe('admin-123');
            expect(auditInfo.actorType).toBe(ActorType.ADMIN);
            expect(auditInfo.reason).toBe('ADMIN_ADJUSTMENT');
        });
    });

    describe('Validation', () => {
        it('should return true for valid transaction', () => {
            const txn = new Transaction(createTransactionProps());
            expect(txn.validate()).toBe(true);
        });
    });

    describe('Serialization', () => {
        it('should convert to plain object', () => {
            const props = createTransactionProps();
            const txn = new Transaction(props);
            const obj = txn.toObject();

            expect(obj).toEqual(expect.objectContaining({
                id: 'txn-123',
                walletId: 'wallet-456',
                type: TransactionType.CREDIT,
                amount: 1000,
            }));
        });

        it('should return immutable metadata copy', () => {
            const txn = new Transaction(createTransactionProps({
                metadata: { key: 'value' },
            }));

            const metadata = txn.metadata;
            expect(metadata).toEqual({ key: 'value' });
        });
    });

    describe('Optional Fields', () => {
        it('should handle paymentId', () => {
            const txn = new Transaction(createTransactionProps({ paymentId: 'pay-123' }));
            expect(txn.paymentId).toBe('pay-123');
        });

        it('should handle refundId', () => {
            const txn = new Transaction(createTransactionProps({ refundId: 'ref-123' }));
            expect(txn.refundId).toBe('ref-123');
        });

        it('should handle payoutId', () => {
            const txn = new Transaction(createTransactionProps({ payoutId: 'payout-123' }));
            expect(txn.payoutId).toBe('payout-123');
        });

        it('should handle referenceType and referenceId', () => {
            const txn = new Transaction(createTransactionProps({
                referenceType: 'ORDER',
                referenceId: 'order-123',
            }));
            expect(txn.referenceType).toBe('ORDER');
            expect(txn.referenceId).toBe('order-123');
        });
    });
});
