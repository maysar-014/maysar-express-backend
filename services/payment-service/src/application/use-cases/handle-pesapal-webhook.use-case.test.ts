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

  it('ignores webhook when payment cannot be found by provider reference or ID', async () => {
    const useCase = new HandlePesapalWebhookUseCase(
      {
        findByProviderReference: jest.fn().mockResolvedValue(null),
        findById: jest.fn().mockResolvedValue(null)
      } as never,
      { checkPaymentStatus: jest.fn() } as never,
      { publish: jest.fn() } as never
    );

    await expect(useCase.execute('track-1', 'merchant-1', 'PENDING', payload)).resolves.toEqual({
      handled: false,
      paymentId: 'track-1',
      status: 'IGNORED'
    });
    expect(loggerWarnMock).toHaveBeenCalledWith('Payment not found for webhook', { providerReference: 'track-1' });
  });

  it('falls back to payment ID lookup when provider reference is not stored yet', async () => {
    const payment = makePayment(PaymentStatus.PROCESSING);
    const repo = {
      findByProviderReference: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(payment),
      update: jest.fn().mockResolvedValue(undefined)
    };
    const provider = { checkPaymentStatus: jest.fn().mockResolvedValue({ status: 'COMPLETED' }) };
    const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
    const useCase = new HandlePesapalWebhookUseCase(repo as never, provider as never, eventBus as never);

    const result = await useCase.execute('pay-1', 'merchant-1', 'COMPLETED', payload);

    expect(repo.findByProviderReference).toHaveBeenCalledWith('pay-1');
    expect(repo.findById).toHaveBeenCalledWith('pay-1');
    expect(result.status).toBe('COMPLETED');
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

  it('returns early when payment is already partially refunded', async () => {
    const payment = makePayment(PaymentStatus.PARTIALLY_REFUNDED);
    const repo = {
      findByProviderReference: jest.fn().mockResolvedValue(payment),
      update: jest.fn()
    };
    const provider = { checkPaymentStatus: jest.fn() };
    const eventBus = { publish: jest.fn() };
    const useCase = new HandlePesapalWebhookUseCase(
      repo as never,
      provider as never,
      eventBus as never
    );

    const result = await useCase.execute('track-1', 'merchant-1', 'COMPLETED', payload);

    expect(result).toEqual({
      handled: true,
      paymentId: 'pay-1',
      status: PaymentStatus.PARTIALLY_REFUNDED
    });
    expect(repo.update).not.toHaveBeenCalled();
    expect(provider.checkPaymentStatus).not.toHaveBeenCalled();
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

  it('transitions pending payments through processing before completion', async () => {
    const payment = makePayment(PaymentStatus.PENDING);
    const repo = { findByProviderReference: jest.fn().mockResolvedValue(payment), update: jest.fn().mockResolvedValue(undefined) };
    const provider = { checkPaymentStatus: jest.fn().mockResolvedValue({ status: 'COMPLETED' }) };
    const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
    const useCase = new HandlePesapalWebhookUseCase(repo as never, provider as never, eventBus as never);

    const result = await useCase.execute('track-1', 'provider-tx-1', 'COMPLETED', payload);

    expect(payment.status).toBe(PaymentStatus.COMPLETED);
    expect(repo.update).toHaveBeenCalledWith(payment);
    expect(result.status).toBe('COMPLETED');
  });

  it('falls back to provider reference when provider transaction reference is missing', async () => {
    const payment = makePayment(PaymentStatus.PENDING);
    const repo = {
      findByProviderReference: jest.fn().mockResolvedValue(payment),
      update: jest.fn().mockResolvedValue(undefined)
    };
    const provider = { checkPaymentStatus: jest.fn().mockResolvedValue({ status: 'COMPLETED' }) };
    const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
    const webhookEvents = {
      recordReceived: jest.fn().mockResolvedValue({ id: 'webhook-1' }),
      markProcessed: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined)
    };
    const useCase = new HandlePesapalWebhookUseCase(
      repo as never,
      provider as never,
      eventBus as never,
      webhookEvents as never
    );

    const result = await useCase.execute('track-1', '', 'COMPLETED', payload);

    expect(webhookEvents.recordReceived).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'track-1',
        payload: expect.objectContaining({
          providerTransactionReference: 'track-1'
        })
      })
    );
    expect(result.status).toBe('COMPLETED');
    expect(payment.metadata.providerTransactionId).toBe('track-1');
  });

  it('continues processing when webhook receipt persistence fails', async () => {
    const payment = makePayment(PaymentStatus.PROCESSING);
    const repo = {
      findByProviderReference: jest.fn().mockResolvedValue(payment),
      update: jest.fn().mockResolvedValue(undefined)
    };
    const provider = { checkPaymentStatus: jest.fn().mockResolvedValue({ status: 'COMPLETED' }) };
    const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
    const webhookEvents = {
      recordReceived: jest.fn().mockRejectedValue(new Error('table missing')),
      markProcessed: jest.fn(),
      markFailed: jest.fn()
    };
    const useCase = new HandlePesapalWebhookUseCase(
      repo as never,
      provider as never,
      eventBus as never,
      webhookEvents as never
    );

    const result = await useCase.execute('track-1', 'provider-tx-1', 'COMPLETED', payload);

    expect(result.status).toBe('COMPLETED');
    expect(repo.update).toHaveBeenCalledWith(payment);
    expect(webhookEvents.markProcessed).not.toHaveBeenCalled();
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


