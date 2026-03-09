import type { CertificationExpiredEvent } from './certification-expired.event';

describe('CertificationExpiredEvent', () => {
  it('supports the event contract shape', () => {
    const event: CertificationExpiredEvent = {
      learnerId: 'learner-1',
      learnerRole: 'courier',
      moduleId: 'module-1',
      expiredAt: new Date('2026-03-08T00:00:00.000Z')
    };

    expect(event.learnerRole).toBe('courier');
    expect(event.moduleId).toBe('module-1');
  });
});
