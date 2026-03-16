import { PaymentServiceClient } from './payment-service.client';

const mockProcessPayment = jest.fn();
const mockCheckStatus = jest.fn();

jest.mock('../../../../payment-service/src/container', () => ({
  Container: {
    getInstance: () => ({
      processPaymentUseCase: { execute: (...args: unknown[]) => mockProcessPayment(...args) },
      checkPaymentStatusUseCase: { execute: (...args: unknown[]) => mockCheckStatus(...args) }
    })
  }
}));

describe('PaymentServiceClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates payment and fetches status in-process', async () => {
    mockProcessPayment.mockResolvedValueOnce({
      success: true,
      paymentId: 'pay-1',
      status: 'PENDING',
      redirectUrl: 'http://redirect'
    });
    mockCheckStatus.mockResolvedValueOnce({
      paymentId: 'pay-1',
      status: 'COMPLETED'
    });

    const client = new PaymentServiceClient();

    await expect(
      client.createPayment({
        orderId: 'ord-1',
        userId: 'u1',
        amount: 1000,
        currency: 'TZS',
        method: 'MOBILE_MONEY'
      })
    ).resolves.toEqual(expect.objectContaining({ success: true }));
    await expect(client.getPaymentStatus('pay-1')).resolves.toEqual(
      expect.objectContaining({ success: true, data: expect.objectContaining({ status: 'COMPLETED' }) })
    );
    expect(mockProcessPayment).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'ord-1', userId: 'u1' }));
    expect(mockCheckStatus).toHaveBeenCalledWith({ paymentId: 'pay-1' });
  });
});
