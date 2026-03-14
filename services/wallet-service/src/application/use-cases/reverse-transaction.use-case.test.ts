import { ReverseTransactionUseCase } from './reverse-transaction.use-case';
import { Wallet, WalletStatus } from '../../domain/entities/wallet.entity';
import { Transaction, TransactionType } from '../../domain/entities/transaction.entity';
import { AuditInfo, ActorType } from '../../domain/value-objects/audit-info.value-object';

const makeAuditInfo = () =>
  AuditInfo.create({
    actor: 'admin-1',
    actorType: ActorType.ADMIN,
    action: 'REVERSE_TRANSACTION',
    reason: 'manual correction',
    ipAddress: '127.0.0.1',
    userAgent: 'jest'
  });

const makeWallet = (balance: number) =>
  new Wallet({
    id: 'wallet-1',
    userId: 'user-1',
    balance,
    currency: 'TZS',
    status: WalletStatus.ACTIVE,
    frozenAmount: 0,
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
    updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    codCommitmentLimit: 10000,
    codCommitmentUsed: 0,
    codCommitmentCount: 0,
    version: 1
  });

const makeTransaction = (type: TransactionType, amount = 50) => {
  const isCredit = type === TransactionType.CREDIT;
  const isDebit = type === TransactionType.DEBIT;
  const balanceBefore = 100;
  const balanceAfter = isCredit ? balanceBefore + amount : isDebit ? balanceBefore - amount : balanceBefore;

  return new Transaction({
    id: 'tx-original',
    walletId: 'wallet-1',
    userId: 'user-1',
    type,
    amount,
    currency: 'TZS',
    balanceBefore,
    balanceAfter,
    frozenAmountBefore: 0,
    frozenAmountAfter: 0,
    description: 'original transaction',
    metadata: {},
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
    correlationId: 'corr-original',
    initiatedBy: 'system',
    initiatedByType: ActorType.SYSTEM,
    reason: 'original',
    isReversed: false,
    reversalTransactionId: undefined,
    isCODRelated: false,
    codConfirmationRequired: false
  });
};

describe('ReverseTransactionUseCase', () => {
  const setup = () => {
    const walletRepository = {
      findById: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined)
    };
    const transactionRepository = {
      findById: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined)
    };
    const idempotencyService = {
      checkIdempotency: jest.fn().mockResolvedValue(null),
      storeResult: jest.fn().mockResolvedValue(undefined)
    };
    const eventPublisher = {
      publishWalletDebited: jest.fn().mockResolvedValue(undefined)
    };
    const auditLogRepository = {
      save: jest.fn().mockResolvedValue(undefined)
    };

    const useCase = new ReverseTransactionUseCase(
      walletRepository as never,
      transactionRepository as never,
      idempotencyService as never,
      eventPublisher as never,
      auditLogRepository as never
    );

    return {
      useCase,
      walletRepository,
      transactionRepository,
      idempotencyService,
      eventPublisher,
      auditLogRepository
    };
  };

  const baseDto = {
    transactionId: 'tx-original',
    reason: 'duplicate booking',
    idempotencyKey: 'idem-1',
    correlationId: 'corr-1',
    auditInfo: makeAuditInfo()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached idempotent result without processing', async () => {
    const ctx = setup();
    ctx.idempotencyService.checkIdempotency.mockResolvedValue({
      reversed: true,
      reversalTransactionId: 'cached-rev-id'
    });

    const result = await ctx.useCase.execute(baseDto);

    expect(result).toEqual({ reversed: true, reversalTransactionId: 'cached-rev-id' });
    expect(ctx.transactionRepository.findById).not.toHaveBeenCalled();
  });

  it('throws when original transaction is missing', async () => {
    const ctx = setup();
    ctx.transactionRepository.findById.mockResolvedValue(null);

    await expect(ctx.useCase.execute(baseDto)).rejects.toThrow('Transaction not found');
  });

  it('returns already-reversed response when original was previously reversed', async () => {
    const ctx = setup();
    ctx.transactionRepository.findById.mockResolvedValue({
      isReversed: true,
      reversalTransactionId: 'existing-rev-id'
    });

    const result = await ctx.useCase.execute(baseDto);

    expect(result).toEqual({
      reversed: true,
      reversalTransactionId: 'existing-rev-id'
    });
    expect(ctx.walletRepository.findById).not.toHaveBeenCalled();
  });

  it('throws when wallet is missing for existing transaction', async () => {
    const ctx = setup();
    ctx.transactionRepository.findById.mockResolvedValue(makeTransaction(TransactionType.CREDIT));
    ctx.walletRepository.findById.mockResolvedValue(null);

    await expect(ctx.useCase.execute(baseDto)).rejects.toThrow('Wallet not found');
  });

  it('reverses credit transactions into debit transactions', async () => {
    const ctx = setup();
    const original = makeTransaction(TransactionType.CREDIT, 50);
    const wallet = makeWallet(200);
    ctx.transactionRepository.findById.mockResolvedValue(original);
    ctx.walletRepository.findById.mockResolvedValue(wallet);

    const result = await ctx.useCase.execute(baseDto);

    expect(result.reversed).toBe(true);
    expect(ctx.walletRepository.update).toHaveBeenCalledWith(wallet);
    expect(ctx.transactionRepository.save).toHaveBeenCalledTimes(1);

    const saved = ctx.transactionRepository.save.mock.calls[0][0] as Transaction;
    expect(saved.type).toBe(TransactionType.DEBIT);
    expect(saved.amount).toBe(50);

    expect(ctx.idempotencyService.storeResult).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ reversed: true })
    );
    expect(ctx.eventPublisher.publishWalletDebited).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WalletDebited',
        originalTransactionId: 'tx-original'
      })
    );
    expect(ctx.auditLogRepository.save).toHaveBeenCalledWith(
      baseDto.auditInfo,
      'wallet-1',
      'WALLET',
      'REVERSE_TRANSACTION: tx-original'
    );
  });

  it('reverses debit transactions into credit transactions', async () => {
    const ctx = setup();
    const original = makeTransaction(TransactionType.DEBIT, 30);
    const wallet = makeWallet(120);
    ctx.transactionRepository.findById.mockResolvedValue(original);
    ctx.walletRepository.findById.mockResolvedValue(wallet);

    await ctx.useCase.execute({ ...baseDto, idempotencyKey: 'idem-2' });

    const saved = ctx.transactionRepository.save.mock.calls[0][0] as Transaction;
    expect(saved.type).toBe(TransactionType.CREDIT);
    expect(ctx.eventPublisher.publishWalletDebited).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WalletCredited',
        originalTransactionId: 'tx-original'
      })
    );
  });

  it('throws for unsupported transaction types', async () => {
    const ctx = setup();
    const freezeTx = new Transaction({
      id: 'tx-original',
      walletId: 'wallet-1',
      userId: 'user-1',
      type: TransactionType.FREEZE,
      amount: 10,
      currency: 'TZS',
      balanceBefore: 100,
      balanceAfter: 100,
      frozenAmountBefore: 0,
      frozenAmountAfter: 10,
      description: 'freeze',
      metadata: {},
      createdAt: new Date(),
      correlationId: 'corr-freeze',
      initiatedBy: 'system',
      initiatedByType: ActorType.SYSTEM,
      reason: 'freeze',
      isReversed: false,
      isCODRelated: false,
      codConfirmationRequired: false
    });
    ctx.transactionRepository.findById.mockResolvedValue(freezeTx);
    ctx.walletRepository.findById.mockResolvedValue(makeWallet(100));

    await expect(ctx.useCase.execute({ ...baseDto, idempotencyKey: 'idem-3' })).rejects.toThrow(
      'Cannot reverse transaction type FREEZE'
    );
  });
});
