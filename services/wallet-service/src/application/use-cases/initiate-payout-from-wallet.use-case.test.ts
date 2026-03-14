import { InitiatePayoutFromWalletUseCase } from './initiate-payout-from-wallet.use-case';
import { PayoutMethod } from '../../../../../shared-contracts/payout-service-contracts';
import { ActorType, AuditInfo } from '../../domain/value-objects/audit-info.value-object';

describe('InitiatePayoutFromWalletUseCase', () => {
  const setup = () => {
    const debitWalletUseCase = {
      execute: jest.fn()
    };
    const creditWalletUseCase = {
      execute: jest.fn().mockResolvedValue({ success: true })
    };
    const payoutServiceClient = {
      initiatePayout: jest.fn()
    };
    const eventPublisher = {
      publishWalletPayoutInitiated: jest.fn().mockResolvedValue(undefined)
    };

    const useCase = new InitiatePayoutFromWalletUseCase(
      debitWalletUseCase as never,
      creditWalletUseCase as never,
      payoutServiceClient as never,
      eventPublisher as never
    );

    return {
      useCase,
      debitWalletUseCase,
      creditWalletUseCase,
      payoutServiceClient,
      eventPublisher
    };
  };

  const baseDto = {
    userId: 'user-1',
    userRole: 'enabler',
    amount: 4000,
    currency: 'TZS',
    method: PayoutMethod.MOBILE_MONEY,
    idempotencyKey: 'key-1',
    correlationId: 'corr-1',
    auditInfo: AuditInfo.create({
      actor: 'user-1',
      actorType: ActorType.USER,
      action: 'INITIATE_PAYOUT',
      reason: 'withdraw earnings',
      ipAddress: '127.0.0.1',
      userAgent: 'jest'
    })
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects non-eligible roles before debiting wallet', async () => {
    const ctx = setup();

    const result = await ctx.useCase.execute({ ...baseDto, userRole: 'buyer' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('not eligible');
    expect(ctx.debitWalletUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns debit failure without calling payout service', async () => {
    const ctx = setup();
    ctx.debitWalletUseCase.execute.mockResolvedValue({
      success: false,
      message: 'Insufficient funds'
    });

    const result = await ctx.useCase.execute(baseDto);

    expect(result).toEqual({
      success: false,
      message: 'Insufficient funds'
    });
    expect(ctx.payoutServiceClient.initiatePayout).not.toHaveBeenCalled();
  });

  it('compensates by crediting wallet when payout service returns failure', async () => {
    const ctx = setup();
    ctx.debitWalletUseCase.execute.mockResolvedValue({
      success: true,
      transactionId: 'tx-1',
      balanceBefore: 10000,
      balanceAfter: 6000
    });
    ctx.payoutServiceClient.initiatePayout.mockResolvedValue({
      success: false,
      status: 'FAILED',
      message: 'Provider unavailable'
    });

    const result = await ctx.useCase.execute(baseDto);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Provider unavailable');
    expect(ctx.creditWalletUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        amount: 4000,
        idempotencyKey: 'key-1_payout_failed_reversal'
      })
    );
  });

  it('compensates by crediting wallet when payout throws unexpectedly', async () => {
    const ctx = setup();
    ctx.debitWalletUseCase.execute.mockResolvedValue({
      success: true,
      transactionId: 'tx-2',
      balanceBefore: 10000,
      balanceAfter: 6000
    });
    ctx.payoutServiceClient.initiatePayout.mockRejectedValue(new Error('Timeout'));

    const result = await ctx.useCase.execute({ ...baseDto, idempotencyKey: 'key-2' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Unexpected error during payout: Timeout');
    expect(ctx.creditWalletUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'key-2_payout_error_reversal'
      })
    );
  });

  it('publishes payout-initiated event and returns success payload', async () => {
    const ctx = setup();
    ctx.debitWalletUseCase.execute.mockResolvedValue({
      success: true,
      transactionId: 'tx-3',
      balanceBefore: 9000,
      balanceAfter: 5000
    });
    ctx.payoutServiceClient.initiatePayout.mockResolvedValue({
      success: true,
      payoutId: 'payout-3',
      status: 'PENDING'
    });

    const result = await ctx.useCase.execute(baseDto);

    expect(ctx.payoutServiceClient.initiatePayout).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        userRole: 'enabler',
        amount: 4000,
        currency: 'TZS',
        method: PayoutMethod.MOBILE_MONEY,
        availableBalance: 9000
      })
    );
    expect(ctx.eventPublisher.publishWalletPayoutInitiated).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        payoutId: 'payout-3',
        walletTransactionId: 'tx-3'
      })
    );
    expect(result).toEqual({
      success: true,
      walletTransactionId: 'tx-3',
      payoutId: 'payout-3',
      balanceAfter: 5000,
      message: 'Payout initiated from wallet successfully'
    });
  });
});
