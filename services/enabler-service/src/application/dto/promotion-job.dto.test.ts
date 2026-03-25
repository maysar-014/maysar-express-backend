import type {
  AcceptPromotionJobDto,
  ListPromotionJobsQueryDto,
  PromotionJobDto,
  PromotionJobListResponseDto
} from './promotion-job.dto';

describe('promotion-job DTO contracts', () => {
  it('supports list and accept payloads', () => {
    const query: ListPromotionJobsQueryDto = {
      view: 'available',
      status: 'ACTIVE',
      page: 1,
      limit: 20
    };
    const accept: AcceptPromotionJobDto = {
      note: 'Ready to take this campaign'
    };

    expect(query.view).toBe('available');
    expect(accept.note).toContain('campaign');
  });

  it('supports marketplace response payloads', () => {
    const item: PromotionJobDto = {
      jobId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      campaignId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      title: 'Ramadan Promotion',
      sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      type: 'PROMOTION',
      status: 'ACTIVE',
      startsAt: '2026-03-20T00:00:00.000Z',
      endsAt: '2026-03-30T00:00:00.000Z',
      timezone: 'Africa/Dar_es_Salaam',
      productIds: ['cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV'],
      categoryIds: [],
      pricingRuleCount: 1,
      brief: 'Promote Ramadan offers to new buyers.',
      channels: ['marketplace', 'social'],
      rewardEstimate: 25000,
      acceptanceStatus: 'AVAILABLE',
      acceptedAt: null
    };
    const response: PromotionJobListResponseDto = {
      items: [item],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      }
    };

    expect(response.items[0].pricingRuleCount).toBe(1);
    expect(response.pagination.total).toBe(1);
  });
});
