import {
  IPayoutServiceClient,
  InitiatePayoutDTO,
  PayoutEvents,
  PayoutMethod,
  PayoutResponse,
  PayoutStatus
} from './payout-service-contracts';

describe('Payout service contracts', () => {
  it('defines enums and DTO shape', () => {
    const dto: InitiatePayoutDTO = {
      userId: 'user-1',
      userRole: 'seller',
      amount: 50000,
      currency: 'TZS',
      method: PayoutMethod.BANK_TRANSFER,
      bankDetails: {
        bankName: 'ABC Bank',
        bankCode: '001',
        accountNumber: '123456',
        accountName: 'Seller One'
      }
    };

    expect(dto.method).toBe('BANK_TRANSFER');
    expect(PayoutStatus.PROCESSING).toBe('PROCESSING');
    expect(PayoutEvents.PAYOUT_COMPLETED).toBe('payout.completed');
  });

  it('supports typed client contract', async () => {
    const response: PayoutResponse = { success: true, payoutId: 'p-1', status: PayoutStatus.PENDING };
    const client: IPayoutServiceClient = {
      initiatePayout: jest.fn().mockResolvedValue(response),
      getPayoutStatus: jest.fn().mockResolvedValue({ success: true, status: PayoutStatus.COMPLETED }),
      cancelPayout: jest.fn().mockResolvedValue(undefined)
    };

    await expect(client.initiatePayout({ userId: 'u', userRole: 'seller', amount: 1, currency: 'TZS', method: PayoutMethod.WALLET })).resolves.toEqual(response);
    await expect(client.getPayoutStatus('p-1')).resolves.toEqual(expect.objectContaining({ status: 'COMPLETED' }));
    await expect(client.cancelPayout('p-1', 'duplicate')).resolves.toBeUndefined();
  });
});
