import { PayoutStatus } from '../../../../../shared-contracts/payout-service-contracts';
import { PayoutServiceClient } from './payout-service.client';

const mockInitiatePayout = jest.fn();
const mockFindById = jest.fn();
const mockFindByUserId = jest.fn();
const mockCancelPayout = jest.fn();

jest.mock('../../../../payout-service/src/container', () => ({
  Container: {
    getInstance: () => ({
      initiatePayoutUseCase: { execute: (...args: unknown[]) => mockInitiatePayout(...args) },
      payoutRepository: {
        findById: (...args: unknown[]) => mockFindById(...args),
        findByUserId: (...args: unknown[]) => mockFindByUserId(...args)
      },
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

  it('maps persisted payouts into a serialisable history payload', async () => {
    const createdAt = new Date('2030-01-01T00:00:00.000Z');
    mockFindByUserId.mockResolvedValueOnce([
      {
        id: 'p-1',
        userId: 'u1',
        userRole: 'enabler',
        amount: 40000,
        currency: 'TZS',
        fee: 1000,
        netAmount: 39000,
        method: 'MOBILE_MONEY',
        status: PayoutStatus.COMPLETED,
        createdAt,
        updatedAt: createdAt,
        completedAt: createdAt
      }
    ]);

    const client = new PayoutServiceClient();
    const history = await client.getPayoutsByUserId('u1', 5);

    expect(mockFindByUserId).toHaveBeenCalledWith('u1', 5);
    expect(history).toEqual({
      success: true,
      total: 1,
      payouts: [
        expect.objectContaining({
          payoutId: 'p-1',
          userId: 'u1',
          status: PayoutStatus.COMPLETED,
          amount: 40000,
          netAmount: 39000,
          method: 'MOBILE_MONEY',
          createdAt: '2030-01-01T00:00:00.000Z',
          completedAt: '2030-01-01T00:00:00.000Z',
          processedAt: null,
          failedAt: null
        })
      ]
    });
  });

  it('returns a failed history payload when the payout repository throws', async () => {
    mockFindByUserId.mockRejectedValueOnce(new Error('db down'));

    const client = new PayoutServiceClient();

    await expect(client.getPayoutsByUserId('u1')).resolves.toEqual({
      success: false,
      payouts: [],
      total: 0,
      message: 'db down'
    });
  });
});
