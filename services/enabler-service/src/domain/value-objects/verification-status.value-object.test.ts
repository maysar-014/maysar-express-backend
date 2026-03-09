import { VerificationStatus } from './verification-status.value-object';

describe('VerificationStatus', () => {
  it('creates status using factories and predicates', () => {
    const unverified = VerificationStatus.unverified();
    const pending = VerificationStatus.pending();
    const verified = VerificationStatus.verified();
    const rejected = VerificationStatus.rejected();

    expect(unverified.isUnverified()).toBe(true);
    expect(pending.isPending()).toBe(true);
    expect(verified.isVerified()).toBe(true);
    expect(rejected.isRejected()).toBe(true);
  });

  it('validates invalid status values', () => {
    expect(() => VerificationStatus.create('INVALID')).toThrow('Invalid verification status: INVALID');
  });

  it('checks transition rules and equality', () => {
    const status = VerificationStatus.create('pending');

    expect(status.canTransitionTo('verified')).toBe(true);
    expect(status.canTransitionTo('rejected')).toBe(true);
    expect(status.canTransitionTo('unverified')).toBe(false);

    const same = VerificationStatus.create('pending');
    expect(status.equals(same)).toBe(true);
    expect(status.toString()).toBe('pending');
    expect(status.getValue()).toBe('pending');
  });
});
