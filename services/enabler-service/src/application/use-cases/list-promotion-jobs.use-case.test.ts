import { PromotionJobEntity } from '../../domain/entities/promotion-job.entity';
import { ListPromotionJobsUseCase } from './list-promotion-jobs.use-case';

const makeJob = () => PromotionJobEntity.create({
  id: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  campaignId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  title: 'Ramadan Promotion',
  description: 'Boost seasonal sales',
  sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  type: 'PROMOTION',
  status: 'ACTIVE',
  startDate: new Date('2026-03-20T00:00:00.000Z'),
  endDate: new Date('2026-03-30T00:00:00.000Z'),
  timezone: 'Africa/Dar_es_Salaam',
  productIds: ['cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV'],
  categoryIds: [],
  pricingRuleCount: 1,
  metadata: { brief: 'Promote seasonal offers', channels: ['marketplace'], rewardEstimate: 25000 },
  createdAt: new Date('2026-03-19T00:00:00.000Z'),
  updatedAt: new Date('2026-03-19T00:00:00.000Z')
});

describe('ListPromotionJobsUseCase', () => {
  it('lists available jobs and excludes accepted ones by default', async () => {
    const enablerRepository = { findById: jest.fn().mockResolvedValue({ id: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' }) };
    const promotionJobRepository = {
      findMarketplaceJobs: jest.fn().mockResolvedValue({
        items: [makeJob()],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      })
    };
    const assignmentRepository = {
      listAccepted: jest.fn().mockResolvedValue([])
    };
    const useCase = new ListPromotionJobsUseCase(
      enablerRepository as never,
      promotionJobRepository as never,
      assignmentRepository as never
    );

    const result = await useCase.execute('usr_01ARZ3NDEKTSV4RRFFQ69G5FAV');

    expect(promotionJobRepository.findMarketplaceJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeIds: []
      })
    );
    expect(result.items[0].acceptanceStatus).toBe('AVAILABLE');
    expect(result.items[0].rewardEstimate).toBe(25000);
  });

  it('returns accepted assignments when the accepted view is requested', async () => {
    const useCase = new ListPromotionJobsUseCase(
      { findById: jest.fn().mockResolvedValue({ id: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' }) } as never,
      {} as never,
      {
        listAccepted: jest.fn().mockResolvedValue([
          {
            taskId: 'enb_tas_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            jobId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            campaignId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            title: 'Ramadan Promotion',
            sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            type: 'PROMOTION',
            status: 'ACTIVE',
            taskStatus: 'ASSIGNED',
            startsAt: '2026-03-20T00:00:00.000Z',
            endsAt: '2026-03-30T00:00:00.000Z',
            timezone: 'Africa/Dar_es_Salaam',
            productIds: [],
            categoryIds: [],
            pricingRuleCount: 1,
            channels: ['marketplace'],
            acceptedAt: '2026-03-23T08:00:00.000Z'
          }
        ])
      } as never
    );

    const result = await useCase.execute('usr_01ARZ3NDEKTSV4RRFFQ69G5FAV', { view: 'accepted', page: 1, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].acceptanceStatus).toBe('ACCEPTED');
  });

  it('throws when the enabler does not exist', async () => {
    const useCase = new ListPromotionJobsUseCase(
      { findById: jest.fn().mockResolvedValue(null) } as never,
      {} as never,
      {} as never
    );

    await expect(useCase.execute('missing-enabler')).rejects.toThrow('Enabler not found');
  });
});
