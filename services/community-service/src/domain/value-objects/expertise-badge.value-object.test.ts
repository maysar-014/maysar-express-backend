import { ExpertiseBadge } from './expertise-badge.value-object';

describe('ExpertiseBadge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates badge and keeps endorsements/training unique', () => {
    const badge = ExpertiseBadge.create('Retail', 'BEGINNER');

    badge.addPeerEndorsement('u1');
    badge.addPeerEndorsement('u1');
    badge.addTrainingCompletion('m1');
    badge.addTrainingCompletion('m1');

    expect(badge.peerEndorsements).toEqual(['u1']);
    expect(badge.trainingCompletions).toEqual(['m1']);
    expect(badge.isVerified()).toBe(false);
  });

  it('verifies badge with future expiry and handles expiration/renewal flow', () => {
    const badge = ExpertiseBadge.create('Retail', 'INTERMEDIATE');
    const future = new Date('2026-01-10T10:00:00.000Z');

    badge.verify('admin-1', future);
    expect(badge.isVerified()).toBe(true);

    jest.setSystemTime(new Date('2026-01-11T10:00:00.000Z'));
    expect(badge.isExpired()).toBe(true);
    expect(() => badge.renew(new Date('2026-01-15T10:00:00.000Z'))).not.toThrow();
  });

  it('applies upgrade rules and level transitions', () => {
    const badge = ExpertiseBadge.create('Tech', 'BEGINNER');
    badge.addPeerEndorsement('u1');
    badge.addPeerEndorsement('u2');
    badge.addTrainingCompletion('t1');
    badge.markBusinessVerified();

    expect(
      badge.canUpgradeToLevel('INTERMEDIATE', {
        minEndorsements: 2,
        minTrainingCompletions: 1,
        requireBusinessVerification: true
      })
    ).toBe(true);

    badge.upgradeLevel('INTERMEDIATE');
    expect(badge.level).toBe('INTERMEDIATE');
    expect(() => badge.upgradeLevel('BEGINNER')).toThrow('Can only upgrade to a higher level');
  });

  it('validates area and expiration constraints', () => {
    expect(() => ExpertiseBadge.create('', 'BEGINNER')).toThrow('Expertise badge must have an area');
    expect(() =>
      new ExpertiseBadge({
        area: 'Retail',
        level: 'BEGINNER',
        expiresAt: new Date('2025-12-01T00:00:00.000Z'),
        peerEndorsements: [],
        trainingCompletions: [],
        businessVerified: false
      })
    ).toThrow('Expiration date cannot be in the past');
  });
});
