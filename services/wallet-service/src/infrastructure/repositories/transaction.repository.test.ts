import { Transaction, TransactionType } from '../../domain/entities/transaction.entity';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository';
import { ActorType } from '../../domain/value-objects/audit-info.value-object';
import { TransactionRepository } from './transaction.repository';

const createTransaction = (): Transaction =>
  new Transaction({
    id: 'tx-1',
    walletId: 'wallet-1',
    userId: 'user-1',
    type: TransactionType.CREDIT,
    amount: 50,
    currency: 'TZS',
    balanceBefore: 100,
    balanceAfter: 150,
    frozenAmountBefore: 0,
    frozenAmountAfter: 0,
    description: 'Wallet credit',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    correlationId: 'corr-1',
    idempotencyKey: 'idem-1',
    initiatedBy: 'system',
    initiatedByType: ActorType.SYSTEM,
    reason: 'credit',
    isReversed: false,
    isCODRelated: false,
    codConfirmationRequired: false
  });

const createPrismaMock = () => ({
  wallet_Transaction: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn()
  }
});

describe('TransactionRepository', () => {
  it('satisfies the domain transaction repository contract', () => {
    const prismaMock = createPrismaMock();
    const repository: ITransactionRepository = new TransactionRepository(prismaMock as never);

    expect(repository).toBeInstanceOf(TransactionRepository);
  });

  it('persists transaction entries with mapped fields', async () => {
    const prismaMock = createPrismaMock();
    const repository = new TransactionRepository(prismaMock as never);
    const transaction = createTransaction();

    await repository.save(transaction);

    expect(prismaMock.wallet_Transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 'tx-1',
          walletId: 'wallet-1',
          type: 'CREDIT',
          amount: 50,
          correlationId: 'corr-1'
        })
      })
    );
  });

  it('maps records to domain transactions and supports reference lookups', async () => {
    const prismaMock = createPrismaMock();
    const repository = new TransactionRepository(prismaMock as never);

    const dbRecord = {
      id: 'tx-2',
      walletId: 'wallet-1',
      userId: 'user-1',
      type: 'CREDIT',
      amount: 30,
      currency: 'TZS',
      balanceBefore: 100,
      balanceAfter: 130,
      frozenAmountBefore: 0,
      frozenAmountAfter: 0,
      description: 'Wallet credit',
      metadata: { source: 'test' },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      correlationId: 'corr-2',
      idempotencyKey: 'idem-2',
      initiatedBy: 'system',
      initiatedByType: null,
      reason: 'credit',
      isReversed: false,
      reversalTransactionId: null,
      expiresAt: null,
      referenceType: 'PAYMENT',
      referenceId: 'payment-1',
      isCODRelated: false,
      codOrderId: null,
      codConfirmationRequired: false,
      codConfirmedAt: null
    };

    prismaMock.wallet_Transaction.findUnique.mockResolvedValueOnce(dbRecord);
    prismaMock.wallet_Transaction.findMany.mockResolvedValue([dbRecord]);

    const byId = await repository.findById('tx-2');
    const byPayment = await repository.findByPaymentId('payment-1');

    expect(byId?.id).toBe('tx-2');
    expect(byId?.initiatedByType).toBe(ActorType.SYSTEM);
    expect(byPayment).toHaveLength(1);
    expect(prismaMock.wallet_Transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { referenceType: 'PAYMENT', referenceId: 'payment-1' }
      })
    );
  });
});
