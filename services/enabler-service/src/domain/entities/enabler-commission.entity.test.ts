import { EnablerCommissionEntity, EnablerCommissionProps } from './enabler-commission.entity';

describe('EnablerCommissionEntity', () => {
  const baseProps: EnablerCommissionProps = {
    id: 'ec-1',
    enablerId: 'enabler-1',
    enablerOrderId: 'eo-1',
    commissionId: null,
    baseCommission: 120,
    tierBonus: 20,
    performanceBonus: 10,
    totalCommission: 150,
    status: 'pending',
    approvedBy: null,
    approvedAt: null,
    holdUntil: null,
    protectionStatus: 'protected',
    fraudCheckStatus: 'cleared',
    payoutId: null,
    paidAt: null,
    paymentMethod: null,
    calculationDetails: null,
    metadata: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  };

  it('approves and pays commission when checks pass', () => {
    const commission = EnablerCommissionEntity.create({ ...baseProps });
    expect(commission.canBeApproved()).toBe(true);
    commission.approve('admin-1');
    expect(commission.status).toBe('approved');
    expect(commission.isApproved).toBe(true);
    expect(commission.canBePaid()).toBe(true);

    commission.markAsPaid('payout-1', 'bank');
    expect(commission.status).toBe('paid');
    expect(commission.isPaid).toBe(true);
    expect(commission.toPlainObject().payoutId).toBe('payout-1');
  });

  it('handles hold, fraud flags, and hold release', () => {
    const commission = EnablerCommissionEntity.create({ ...baseProps });
    commission.putOnHold('manual review', 2);
    expect(commission.status).toBe('on_hold');
    expect(commission.holdUntil).toBeInstanceOf(Date);
    expect(commission.canBeApproved()).toBe(false);

    commission.releaseHold();
    expect(commission.status).toBe('approved');

    commission.flagForFraud('suspicious');
    expect(commission.toPlainObject()).toEqual(
      expect.objectContaining({ status: 'on_hold', fraudCheckStatus: 'flagged' })
    );
  });

  it('supports disputes/forfeits and validates state restrictions', () => {
    const pending = EnablerCommissionEntity.create({ ...baseProps });
    pending.raiseDispute('wrong amount');
    expect(pending.status).toBe('disputed');
    pending.forfeit('policy breach');
    expect(pending.toPlainObject()).toEqual(expect.objectContaining({ status: 'forfeited', protectionStatus: 'forfeited' }));

    const paid = EnablerCommissionEntity.create({
      ...baseProps,
      status: 'paid',
      paidAt: new Date('2026-01-02T00:00:00.000Z')
    });
    expect(() => paid.raiseDispute('too late')).toThrow('Cannot dispute a paid commission');
    expect(() => pending.releaseHold()).toThrow('Commission is not on hold');
  });
});
