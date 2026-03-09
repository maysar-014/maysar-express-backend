import { CommissionProtectionPolicy } from './commission-protection.policy';

describe('CommissionProtectionPolicy', () => {
  it('returns blocked reasons for dispute, fraud, and incomplete orders', () => {
    expect(
      CommissionProtectionPolicy.isCommissionProtected({
        orderStatus: 'DELIVERED',
        isDisputed: true
      })
    ).toEqual({ protected: false, reason: 'Order is disputed' });

    expect(
      CommissionProtectionPolicy.isCommissionProtected({
        orderStatus: 'DELIVERED',
        isDisputed: false,
        fraudScore: 90
      })
    ).toEqual({ protected: false, reason: 'High fraud risk detected' });

    expect(
      CommissionProtectionPolicy.isCommissionProtected({
        orderStatus: 'PROCESSING',
        isDisputed: false,
        fraudScore: 10
      })
    ).toEqual({ protected: false, reason: 'Order not completed' });
  });

  it('allows payout release only after return window and protection check passes', () => {
    expect(
      CommissionProtectionPolicy.canReleasePayout({
        orderStatus: 'COMPLETED',
        isDisputed: false,
        daysSinceDelivery: 10
      })
    ).toBe(false);

    expect(
      CommissionProtectionPolicy.canReleasePayout({
        orderStatus: 'DELIVERED',
        isDisputed: false,
        daysSinceDelivery: 14
      })
    ).toBe(true);
  });
});

