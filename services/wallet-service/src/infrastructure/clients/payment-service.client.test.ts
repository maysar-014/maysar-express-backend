import axios from 'axios';
import { PaymentServiceClient } from './payment-service.client';

jest.mock('axios');

describe('PaymentServiceClient', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates payment and fetches status via configured base url', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { success: true, data: { paymentId: 'pay-1', status: 'PENDING', redirectUrl: 'http://redirect' } }
    } as never);
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, data: { paymentId: 'pay-1', status: 'COMPLETED' } }
    } as never);

    const client = new PaymentServiceClient('http://payments');

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

    expect(mockedAxios.post).toHaveBeenCalledWith('http://payments/api/payments', expect.any(Object));
    expect(mockedAxios.get).toHaveBeenCalledWith('http://payments/api/payments/pay-1');
  });
});
