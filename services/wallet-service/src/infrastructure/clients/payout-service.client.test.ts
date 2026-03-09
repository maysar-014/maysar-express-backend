import axios from 'axios';
import { PayoutStatus } from '../../../../../shared-contracts/payout-service-contracts';
import { PayoutServiceClient } from './payout-service.client';

jest.mock('axios');

describe('PayoutServiceClient', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.isAxiosError.mockImplementation((e: unknown) => Boolean((e as any)?.isAxiosError));
  });

  it('calls payout endpoints successfully', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true, payoutId: 'p-1', status: PayoutStatus.PENDING } } as never);
    mockedAxios.get.mockResolvedValueOnce({ data: { success: true, status: PayoutStatus.COMPLETED } } as never);
    mockedAxios.post.mockResolvedValueOnce({ data: {} } as never);

    const client = new PayoutServiceClient('http://payout');

    await expect(
      client.initiatePayout({ userId: 'u1', userRole: 'seller', amount: 100, currency: 'TZS', method: 'WALLET' as never })
    ).resolves.toEqual(expect.objectContaining({ success: true, payoutId: 'p-1' }));
    await expect(client.getPayoutStatus('p-1')).resolves.toEqual(expect.objectContaining({ success: true }));
    await expect(client.cancelPayout('p-1', 'duplicate')).resolves.toBeUndefined();

    expect(mockedAxios.post).toHaveBeenCalledWith('http://payout/api/payouts/p-1/cancel', { reason: 'duplicate' });
  });

  it('returns failed response when axios calls throw', async () => {
    mockedAxios.post.mockRejectedValueOnce({ isAxiosError: true, response: { data: { error: 'boom' } }, message: 'x' });
    mockedAxios.get.mockRejectedValueOnce(new Error('network down'));

    const client = new PayoutServiceClient('http://payout');

    await expect(
      client.initiatePayout({ userId: 'u1', userRole: 'seller', amount: 100, currency: 'TZS', method: 'WALLET' as never })
    ).resolves.toEqual({
      success: false,
      status: PayoutStatus.FAILED,
      message: 'boom'
    });
    await expect(client.getPayoutStatus('p-1')).resolves.toEqual({
      success: false,
      status: PayoutStatus.FAILED,
      message: 'network down'
    });
  });
});
