import {
  CommissionStatus,
  CommissionType,
  ReferralStatus,
  RewardStatus,
  RewardType
} from './commission-types.value-object';

describe('commission type enums', () => {
  it('exposes expected commission and status values', () => {
    expect(CommissionType.SALE).toBe('sale');
    expect(CommissionType.TASK_COMPLETION).toBe('task_completion');
    expect(CommissionStatus.PENDING).toBe('pending');
    expect(CommissionStatus.EARNED).toBe('earned');
  });

  it('exposes referral and reward lifecycle values', () => {
    expect(ReferralStatus.COMPLETED).toBe('completed');
    expect(ReferralStatus.EXPIRED).toBe('expired');
    expect(RewardStatus.REDEEMED).toBe('redeemed');
    expect(RewardStatus.CANCELLED).toBe('cancelled');
    expect(RewardType.MILESTONE).toBe('milestone');
  });

  it('keeps enum value sets unique', () => {
    const commissionValues = Object.values(CommissionType);
    const rewardValues = Object.values(RewardType);

    expect(new Set(commissionValues).size).toBe(commissionValues.length);
    expect(new Set(rewardValues).size).toBe(rewardValues.length);
  });
});
