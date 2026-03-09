import type { CommissionService } from '../shared-contracts/commission-service-contracts';

describe('commission-service contracts', () => {
  it('supports commission calculation and settlement payloads', () => {
    const calculate: CommissionService.Commands.CalculateCommission = {
      transactionId: 'tx-1',
      amount: { amount: 100000, currency: 'TZS' },
      type: 'ORDER'
    };
    const settled: CommissionService.Events.CommissionSettled = {
      commissionId: 'comm-1',
      transactionId: 'tx-1',
      amount: { amount: 12000, currency: 'TZS' },
      recipientId: 'seller-1',
      settledAt: new Date('2026-03-09T00:00:00.000Z')
    };

    expect(calculate.amount.currency).toBe('TZS');
    expect(settled.recipientId).toBe('seller-1');
  });
});
