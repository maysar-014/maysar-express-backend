import type { AwardBadgeRequest, AwardBadgeResponse } from './award-badge.dto';

describe('award-badge.dto', () => {
  it('supports request and response contracts', () => {
    const request: AwardBadgeRequest = {
      learnerId: 'learner-1',
      badgeType: 'SAFETY_MASTER',
      reason: 'Completed advanced safety path',
      metadata: { source: 'manual-review' }
    };
    const response: AwardBadgeResponse = {
      badgeId: 'badge-1',
      learnerId: 'learner-1',
      badgeType: 'SAFETY_MASTER',
      awardedAt: new Date('2026-03-08T00:00:00.000Z')
    };

    expect(request.metadata?.source).toBe('manual-review');
    expect(response.badgeType).toBe('SAFETY_MASTER');
  });
});
