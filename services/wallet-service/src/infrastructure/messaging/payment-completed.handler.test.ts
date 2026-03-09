jest.mock('@shared-events/eventBus', () => ({}), { virtual: true });

import { ActorType, AuditInfo } from '../../domain/value-objects/audit-info.value-object';
import { PaymentCompletedHandler } from './payment-completed.handler';

describe('PaymentCompletedHandler', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('ignores events with invalid payload shape', async () => {
    const creditWalletUseCase = { execute: jest.fn() };
    const eventIdempotency = { withIdempotency: jest.fn() };
    const handler = new PaymentCompletedHandler(creditWalletUseCase as never, eventIdempotency as never);

    await handler.handle({ data: { wrong: true } } as never);

    expect(eventIdempotency.withIdempotency).not.toHaveBeenCalled();
    expect(creditWalletUseCase.execute).not.toHaveBeenCalled();
  });

  it('skips non-top-up payments before idempotency layer', async () => {
    const creditWalletUseCase = { execute: jest.fn() };
    const eventIdempotency = { withIdempotency: jest.fn() };
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const handler = new PaymentCompletedHandler(creditWalletUseCase as never, eventIdempotency as never);

    await handler.handle({
      data: {
        orderId: 'ORDER_123',
        userId: 'user-1',
        amount: 100,
        currency: 'USD',
        paymentId: 'payment-1'
      }
    } as never);

    expect(eventIdempotency.withIdempotency).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('[PaymentCompletedHandler] Skipping non-top-up payment: ORDER_123');
  });

  it('processes top-up payments through idempotency and credits wallet', async () => {
    const creditWalletUseCase = {
      execute: jest.fn().mockResolvedValue(undefined)
    };
    const eventIdempotency = {
      withIdempotency: jest.fn(async (_eventId: string, _consumer: string, run: () => Promise<void>) => run())
    };
    const handler = new PaymentCompletedHandler(creditWalletUseCase as never, eventIdempotency as never);

    await handler.handle({
      data: {
        orderId: 'TOPUP_456',
        userId: 'user-5',
        amount: 250,
        currency: 'TZS',
        paymentId: 'pay-456'
      }
    } as never);

    expect(eventIdempotency.withIdempotency).toHaveBeenCalledWith(
      'pay-456',
      'PaymentCompletedHandler',
      expect.any(Function)
    );
    expect(creditWalletUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-5',
        amount: 250,
        currency: 'TZS',
        description: 'Wallet top-up via TOPUP_456',
        idempotencyKey: 'topup_pay-456',
        correlationId: 'pay-456',
        auditInfo: expect.any(AuditInfo)
      })
    );
    const auditInfo = creditWalletUseCase.execute.mock.calls[0][0].auditInfo as AuditInfo;
    expect(auditInfo.actorType).toBe(ActorType.SYSTEM);
    expect(auditInfo.reason).toBe('Payment pay-456 completed');
  });

  it('swallows crediting errors inside idempotent handler and logs them', async () => {
    const creditWalletUseCase = {
      execute: jest.fn().mockRejectedValue(new Error('credit-failed'))
    };
    const eventIdempotency = {
      withIdempotency: jest.fn(async (_eventId: string, _consumer: string, run: () => Promise<void>) => run())
    };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = new PaymentCompletedHandler(creditWalletUseCase as never, eventIdempotency as never);

    await expect(
      handler.handle({
        data: {
          orderId: 'TOPUP_789',
          userId: 'user-9',
          amount: 300,
          currency: 'USD',
          paymentId: 'pay-789'
        }
      } as never)
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      '[PaymentCompletedHandler] Failed to credit wallet for user user-9:',
      expect.any(Error)
    );
  });
});

