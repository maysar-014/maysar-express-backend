import { PromotionJobController } from './promotion-job.controller';

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('PromotionJobController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns marketplace jobs in the standard success envelope', async () => {
    const controller = new PromotionJobController(
      {
        execute: jest.fn().mockResolvedValue({
          items: [
            {
              jobId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
              campaignId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
              title: 'Ramadan Promotion Boost',
              sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
              type: 'PROMOTION',
              status: 'ACTIVE',
              startsAt: '2026-03-20T00:00:00.000Z',
              endsAt: '2026-03-30T00:00:00.000Z',
              timezone: 'Africa/Dar_es_Salaam',
              productIds: ['cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV'],
              categoryIds: ['obj_01ARZ3NDEKTSV4RRFFQ69G5FAV'],
              pricingRuleCount: 1,
              channels: ['marketplace'],
              rewardEstimate: 25000,
              acceptanceStatus: 'AVAILABLE'
            }
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
        })
      } as never,
      { execute: jest.fn() } as never
    );

    const res = makeRes();
    await controller.listJobs(
      {
        params: { enablerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' },
        query: { view: 'available', page: 1, limit: 20 }
      } as never,
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              jobId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV'
            })
          ])
        })
      })
    );
  });

  it('accepts a promotion job and stamps the authenticated actor', async () => {
    const acceptUseCase = {
      execute: jest.fn().mockResolvedValue({
        jobId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        campaignId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        title: 'Ramadan Promotion Boost',
        sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        type: 'PROMOTION',
        status: 'ACTIVE',
        startsAt: '2026-03-20T00:00:00.000Z',
        endsAt: '2026-03-30T00:00:00.000Z',
        timezone: 'Africa/Dar_es_Salaam',
        productIds: ['cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV'],
        categoryIds: ['obj_01ARZ3NDEKTSV4RRFFQ69G5FAV'],
        pricingRuleCount: 1,
        channels: ['marketplace'],
        rewardEstimate: 25000,
        acceptanceStatus: 'ACCEPTED',
        acceptedAt: '2026-03-23T10:00:00.000Z',
        acceptedByUserId: 'usr_test_0001',
        note: 'Ready to take this campaign'
      })
    };
    const controller = new PromotionJobController(
      { execute: jest.fn() } as never,
      acceptUseCase as never
    );

    const res = makeRes();
    await controller.acceptJob(
      {
        params: {
          enablerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
          jobId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV'
        },
        body: { note: 'Ready to take this campaign' },
        user: { userId: 'usr_test_0001' }
      } as never,
      res
    );

    expect(acceptUseCase.execute).toHaveBeenCalledWith(
      'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      expect.objectContaining({
        note: 'Ready to take this campaign',
        acceptedByUserId: 'usr_test_0001'
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
