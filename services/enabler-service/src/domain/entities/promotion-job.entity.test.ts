import { PromotionJobEntity } from './promotion-job.entity';

describe('PromotionJobEntity', () => {
  it('allows acceptance for active or scheduled jobs before expiry', () => {
    const activeJob = PromotionJobEntity.create({
      id: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      campaignId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      title: 'Ramadan Campaign',
      sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      type: 'PROMOTION',
      status: 'ACTIVE',
      startDate: new Date('2026-03-20T00:00:00.000Z'),
      endDate: new Date('2026-03-30T00:00:00.000Z'),
      timezone: 'Africa/Dar_es_Salaam',
      productIds: [],
      categoryIds: [],
      pricingRuleCount: 1,
      metadata: null,
      createdAt: new Date('2026-03-18T00:00:00.000Z'),
      updatedAt: new Date('2026-03-18T00:00:00.000Z')
    });

    expect(activeJob.canBeAccepted(new Date('2026-03-23T00:00:00.000Z'))).toBe(true);
  });

  it('rejects paused or expired jobs', () => {
    const pausedJob = PromotionJobEntity.create({
      id: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      campaignId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      title: 'Paused Campaign',
      sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      type: 'PROMOTION',
      status: 'PAUSED',
      startDate: new Date('2026-03-20T00:00:00.000Z'),
      endDate: new Date('2026-03-30T00:00:00.000Z'),
      timezone: 'Africa/Dar_es_Salaam',
      productIds: [],
      categoryIds: [],
      pricingRuleCount: 1,
      metadata: null,
      createdAt: new Date('2026-03-18T00:00:00.000Z'),
      updatedAt: new Date('2026-03-18T00:00:00.000Z')
    });

    const expiredJob = PromotionJobEntity.create({
      ...pausedJob.toPlainObject(),
      status: 'ACTIVE',
      endDate: new Date('2026-03-21T00:00:00.000Z')
    });

    expect(pausedJob.canBeAccepted(new Date('2026-03-23T00:00:00.000Z'))).toBe(false);
    expect(expiredJob.canBeAccepted(new Date('2026-03-23T00:00:00.000Z'))).toBe(false);
  });
});
