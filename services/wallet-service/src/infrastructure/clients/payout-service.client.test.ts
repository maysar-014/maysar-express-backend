import { PayoutStatus } from '../../../../../shared-contracts/payout-service-contracts';
import { PayoutServiceClient } from './payout-service.client';

const mockInitiatePayout = jest.fn();
const mockFindById = jest.fn();
const mockCancelPayout = jest.fn();

jest.mock('../../../../payout-service/src/container', () => ({
  Container: {
    getInstance: () => ({
      initiatePayoutUseCase: { execute: (...args: unknown[]) => mockInitiatePayout(...args) },
      payoutRepository: { findById: (...args: unknown[]) => mockFindById(...args) },
      cancelPayoutUseCase: { execute: (...args: unknown[]) => mockCancelPayout(...args) }
    })
  }
}));

describe('PayoutServiceClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls payout endpoints successfully', async () => {
    mockInitiatePayout.mockResolvedValueOnce({
      success: true,
      payoutId: 'p-1',
      status: PayoutStatus.PENDING
    });
    mockFindById.mockResolvedValueOnce({
      id: 'p-1',
      status: PayoutStatus.COMPLETED,
      amount: 100,
      fee: 5,
      netAmount: 95
    });

    const client = new PayoutServiceClient();

    await expect(
      client.initiatePayout({ userId: 'u1', userRole: 'seller', amount: 100, currency: 'TZS', method: 'WALLET' as never })
    ).resolves.toEqual(expect.objectContaining({ success: true, payoutId: 'p-1' }));
    await expect(client.getPayoutStatus('p-1')).resolves.toEqual(expect.objectContaining({ success: true }));
    await expect(client.cancelPayout('p-1', 'duplicate')).resolves.toBeUndefined();
    expect(mockCancelPayout).toHaveBeenCalledWith('p-1', 'duplicate');
  });

  it('returns failed response when container calls throw', async () => {
    mockInitiatePayout.mockRejectedValueOnce(new Error('boom'));
    mockFindById.mockRejectedValueOnce(new Error('network down'));

    const client = new PayoutServiceClient();

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
