import {
  isPayoutEligibleRole,
  isTopUpEligibleRole,
  UserRole,
  UserStatus
} from './user-service-contracts';

describe('user-service-contracts', () => {
  it('enforces payout role eligibility', () => {
    expect(isPayoutEligibleRole(UserRole.ENABLER)).toBe(true);
    expect(isPayoutEligibleRole(UserRole.BUYER)).toBe(false);
    expect(isPayoutEligibleRole(UserRole.SELLER)).toBe(false);
  });

  it('enforces top-up role eligibility', () => {
    expect(isTopUpEligibleRole(UserRole.BUYER)).toBe(true);
    expect(isTopUpEligibleRole(UserRole.SELLER)).toBe(true);
    expect(isTopUpEligibleRole(UserRole.ENABLER)).toBe(false);
    expect(isTopUpEligibleRole(UserRole.COURIER)).toBe(false);
  });

  it('keeps user-status contract values stable', () => {
    expect(UserStatus.ACTIVE).toBe('active');
    expect(UserStatus.SUSPENDED).toBe('suspended');
    expect(UserStatus.PENDING_VERIFICATION).toBe('pending_verification');
  });
});
