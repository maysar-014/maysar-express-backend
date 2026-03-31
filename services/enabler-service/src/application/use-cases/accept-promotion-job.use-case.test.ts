import { PromotionJobEntity } from '../../domain/entities/promotion-job.entity';
import { TaskAssignedEvent } from '../../domain/events/enabler-events';
import { AcceptPromotionJobUseCase } from './accept-promotion-job.use-case';

const makeJob = () => PromotionJobEntity.create({
  id: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  campaignId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  title: 'Ramadan Promotion',
  description: 'Boost seasonal sales',
  sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  type: 'PROMOTION',
  status: 'ACTIVE',
  startDate: new Date('2026-03-20T00:00:00.000Z'),
  endDate: new Date('2099-12-31T00:00:00.000Z'),
  timezone: 'Africa/Dar_es_Salaam',
  productIds: [],
  categoryIds: [],
  pricingRuleCount: 1,
  metadata: { brief: 'Promote seasonal offers', channels: ['marketplace'], rewardEstimate: 25000 },
  createdAt: new Date('2026-03-19T00:00:00.000Z'),
  updatedAt: new Date('2026-03-19T00:00:00.000Z')
});

describe('AcceptPromotionJobUseCase', () => {
  it('accepts a promotion job and publishes a task assignment event', async () => {
    const enablerRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        isApproved: true,
        isActive: true
      })
    };
    const promotionJobRepository = {
      findById: jest.fn().mockResolvedValue(makeJob())
    };
    const assignmentRepository = {
      findAccepted: jest.fn().mockResolvedValue(null),
      accept: jest.fn().mockResolvedValue({
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
        brief: 'Promote seasonal offers',
        channels: ['marketplace'],
        rewardEstimate: 25000,
        acceptedAt: '2026-03-23T08:00:00.000Z',
        acceptedByUserId: 'usr_test_0001',
        note: 'Ready to take this campaign'
      })
    };
    const eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    const useCase = new AcceptPromotionJobUseCase(
      enablerRepository as never,
      promotionJobRepository as never,
      assignmentRepository as never,
      eventPublisher as never
    );

    const result = await useCase.execute(
      'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      { acceptedByUserId: 'usr_test_0001', note: 'Ready to take this campaign' }
    );

    expect(assignmentRepository.accept).toHaveBeenCalled();
    const publishedEvent = eventPublisher.publish.mock.calls[0][0];
    expect(publishedEvent).toBeInstanceOf(TaskAssignedEvent);
    expect(publishedEvent.taskId).toBe('enb_tas_01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(result.acceptanceStatus).toBe('ACCEPTED');
  });

  it('rejects duplicate or unavailable accepts', async () => {
    const duplicateUseCase = new AcceptPromotionJobUseCase(
      { findById: jest.fn().mockResolvedValue({ isApproved: true, isActive: true }) } as never,
      {} as never,
      { findAccepted: jest.fn().mockResolvedValue({ jobId: 'cam_1' }) } as never,
      { publish: jest.fn() } as never
    );

    await expect(duplicateUseCase.execute('en-1', 'cam-1')).rejects.toThrow('Promotion job already accepted');

    const unavailableUseCase = new AcceptPromotionJobUseCase(
      { findById: jest.fn().mockResolvedValue({ isApproved: true, isActive: true }) } as never,
      {
        findById: jest.fn().mockResolvedValue(
          PromotionJobEntity.create({
            ...makeJob().toPlainObject(),
            status: 'PAUSED'
          })
        )
      } as never,
      { findAccepted: jest.fn().mockResolvedValue(null) } as never,
      { publish: jest.fn() } as never
    );

    await expect(unavailableUseCase.execute('en-1', 'cam-1')).rejects.toThrow(
      'Promotion job is not available for acceptance'
    );
  });
});
