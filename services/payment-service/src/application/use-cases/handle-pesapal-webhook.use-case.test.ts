const loggerInfoMock = jest.fn();
const loggerWarnMock = jest.fn();

jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    info: (...args: any[]) => loggerInfoMock(...args),
    warn: (...args: any[]) => loggerWarnMock(...args),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

import {
  Payment,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus
} from '../../domain/entities/payment.entity';
import { HandlePesapalWebhookUseCase } from './handle-pesapal-webhook.use-case';

describe('HandlePesapalWebhookUseCase', () => {
  const payload = {
    eventType: 'payment.status.update',
    providerReference: 'track-1',
    status: 'PENDING',
    amount: 100,
    currency: 'TZS',
    timestamp: new Date('2026-03-09T12:00:00.000Z')
  };

  const makePayment = (status: PaymentStatus): Payment =>
    new Payment({
      id: 'pay-1',
      orderId: 'order-1',
      userId: 'user-1',
      amount: 100,
      currency: 'TZS',
      method: PaymentMethod.MPESA,
      provider: PaymentProvider.PESAPAL,
      status,
      metadata: {},
      createdAt: new Date('2026-03-09T10:00:00.000Z'),
      updatedAt: new Date('2026-03-09T10:00:00.000Z')
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when payment cannot be found by provider reference', async () => {
    const useCase = new HandlePesapalWebhookUseCase(
      { findByProviderReference: jest.fn().mockResolvedValue(null) } as never,
      { checkPaymentStatus: jest.fn() } as never,
      { publish: jest.fn() } as never
    );

    await expect(
      useCase.execute('track-1', 'merchant-1', 'PENDING', payload)
    ).rejects.toThrow('Payment not found: track-1');
    expect(loggerWarnMock).toHaveBeenCalledWith('Payment not found for webhook', { orderTrackingId: 'track-1' });
  });

  it('returns early when payment already has terminal status', async () => {
    const payment = makePayment(PaymentStatus.COMPLETED);
    const useCase = new HandlePesapalWebhookUseCase(
      { findByProviderReference: jest.fn().mockResolvedValue(payment), update: jest.fn() } as never,
      { checkPaymentStatus: jest.fn() } as never,
      { publish: jest.fn() } as never
    );

    const result = await useCase.execute('track-1', 'merchant-1', 'COMPLETED', payload);

    expect(result).toEqual({
      handled: true,
      paymentId: 'pay-1',
      status: PaymentStatus.COMPLETED
    });
  });

  it('marks payment completed and publishes PaymentCompleted event', async () => {
    const payment = makePayment(PaymentStatus.PROCESSING);
    const repo = { findByProviderReference: jest.fn().mockResolvedValue(payment), update: jest.fn().mockResolvedValue(undefined) };
    const provider = { checkPaymentStatus: jest.fn().mockResolvedValue({ status: 'COMPLETED' }) };
    const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
    const useCase = new HandlePesapalWebhookUseCase(repo as never, provider as never, eventBus as never);

    const result = await useCase.execute('track-1', 'merchant-1', 'COMPLETED', payload);

    expect(repo.update).toHaveBeenCalledWith(payment);
    expect(eventBus.publish).toHaveBeenCalledWith(
      'PaymentCompleted.v1',
      expect.objectContaining({
        paymentId: 'pay-1',
        providerReference: 'track-1'
      }),
      expect.objectContaining({ source: 'payment-service', correlationId: 'pay-1' })
    );
    expect(result.status).toBe('COMPLETED');
  });

  it('marks payment failed and publishes PaymentFailed event', async () => {
    const payment = makePayment(PaymentStatus.PROCESSING);
    const repo = { findByProviderReference: jest.fn().mockResolvedValue(payment), update: jest.fn().mockResolvedValue(undefined) };
    const provider = {
      checkPaymentStatus: jest.fn().mockResolvedValue({ status: 'FAILED', failureReason: 'Insufficient funds' })
    };
    const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
    const useCase = new HandlePesapalWebhookUseCase(repo as never, provider as never, eventBus as never);

    const result = await useCase.execute('track-1', 'merchant-1', 'FAILED', payload);

    expect(repo.update).toHaveBeenCalledWith(payment);
    expect(eventBus.publish).toHaveBeenCalledWith(
      'PaymentFailed.v1',
      expect.objectContaining({
        paymentId: 'pay-1',
        failureReason: 'Insufficient funds'
      }),
      expect.objectContaining({ source: 'payment-service', correlationId: 'pay-1' })
    );
    expect(result.status).toBe('FAILED');
  });
});

