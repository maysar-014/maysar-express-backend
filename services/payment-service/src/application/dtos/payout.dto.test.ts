import type { CreatePayoutDto, PayoutResponseDto } from './payout.dto';

describe('payout DTO contracts', () => {
  it('supports create payout payloads with method-specific details', () => {
    const dto: CreatePayoutDto = {
      userId: 'user-1',
      amount: 50000,
      currency: 'TZS',
      method: 'MOBILE_MONEY',
      details: {
        accountNumber: '255712345678',
        accountName: 'Amina Seller',
        provider: 'M-PESA'
      },
      description: 'Weekly settlement'
    };

    expect(dto.details.provider).toBe('M-PESA');
    expect(dto.amount).toBe(50000);
  });

  it('supports payout response payloads', () => {
    const response: PayoutResponseDto = {
      id: 'payout-1',
      userId: 'user-1',
      amount: 50000,
      currency: 'TZS',
      status: 'PENDING',
      method: 'MOBILE_MONEY',
      createdAt: new Date('2026-02-10T08:00:00.000Z'),
      updatedAt: new Date('2026-02-10T08:00:00.000Z'),
      providerReference: 'PAYOUT-REF-1'
    };

    expect(response.status).toBe('PENDING');
    expect(response.providerReference).toBe('PAYOUT-REF-1');
  });
});
