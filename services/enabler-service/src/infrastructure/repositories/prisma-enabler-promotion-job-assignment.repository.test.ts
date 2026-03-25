const mockPrisma = {
  enabler_Task: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    upsert: jest.fn()
  }
};

jest.mock('../database/prisma-client', () => ({
  __esModule: true,
  default: mockPrisma
}));

import { PrismaEnablerPromotionJobAssignmentRepository } from './prisma-enabler-promotion-job-assignment.repository';

describe('PrismaEnablerPromotionJobAssignmentRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists and finds accepted promotion jobs from enabler tasks', async () => {
    const taskRecord = {
      id: 'enb_tas_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      enablerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      taskType: 'PROMOTION_JOB',
      status: 'ASSIGNED',
      sourceType: 'PROMOTION_JOB',
      sourceId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      sourceStatus: 'ACTIVE',
      campaignId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      title: 'Ramadan Promotion',
      description: 'Boost seasonal sales',
      startsAt: new Date('2026-03-20T00:00:00.000Z'),
      endsAt: new Date('2026-03-30T00:00:00.000Z'),
      timezone: 'Africa/Dar_es_Salaam',
      productIds: [],
      categoryIds: [],
      pricingRuleCount: 1,
      brief: null,
      channels: ['marketplace'],
      rewardEstimate: 25000,
      metadata: null,
      acceptedAt: new Date('2026-03-23T08:00:00.000Z'),
      acceptedByUserId: 'usr_test_0001',
      note: null
    };

    mockPrisma.enabler_Task.findMany.mockResolvedValue([taskRecord]);
    mockPrisma.enabler_Task.findFirst.mockResolvedValue(taskRecord);

    const repo = new PrismaEnablerPromotionJobAssignmentRepository();

    const items = await repo.listAccepted('usr_01ARZ3NDEKTSV4RRFFQ69G5FAV');
    const item = await repo.findAccepted('usr_01ARZ3NDEKTSV4RRFFQ69G5FAV', 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV');

    expect(items).toHaveLength(1);
    expect(items[0].taskId).toBe('enb_tas_01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(item?.title).toBe('Ramadan Promotion');
    expect(item?.taskStatus).toBe('ASSIGNED');
  });

  it('creates task rows when accepting new promotion jobs', async () => {
    mockPrisma.enabler_Task.upsert.mockResolvedValue({
      id: 'enb_tas_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      enablerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      taskType: 'PROMOTION_JOB',
      status: 'ASSIGNED',
      sourceType: 'PROMOTION_JOB',
      sourceId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      sourceStatus: 'ACTIVE',
      campaignId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      title: 'Ramadan Promotion',
      description: null,
      startsAt: new Date('2026-03-20T00:00:00.000Z'),
      endsAt: new Date('2026-03-30T00:00:00.000Z'),
      timezone: 'Africa/Dar_es_Salaam',
      productIds: [],
      categoryIds: [],
      pricingRuleCount: 1,
      brief: null,
      channels: ['marketplace'],
      rewardEstimate: 25000,
      metadata: null,
      acceptedAt: new Date('2026-03-23T08:00:00.000Z'),
      acceptedByUserId: null,
      note: null
    });

    const repo = new PrismaEnablerPromotionJobAssignmentRepository();

    const result = await repo.accept('usr_01ARZ3NDEKTSV4RRFFQ69G5FAV', {
      taskId: 'ignored-by-create',
      jobId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      campaignId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      title: 'Ramadan Promotion',
      sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      type: 'PROMOTION',
      status: 'ACTIVE',
      startsAt: '2026-03-20T00:00:00.000Z',
      endsAt: '2026-03-30T00:00:00.000Z',
      timezone: 'Africa/Dar_es_Salaam',
      productIds: [],
      categoryIds: [],
      pricingRuleCount: 1,
      channels: ['marketplace'],
      acceptedAt: '2026-03-23T08:00:00.000Z'
    });

    expect(mockPrisma.enabler_Task.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          enablerId_sourceType_sourceId: {
            enablerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            sourceType: 'PROMOTION_JOB',
            sourceId: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV'
          }
        }
      })
    );
    expect(result.taskId).toBe('enb_tas_01ARZ3NDEKTSV4RRFFQ69G5FAV');
  });
});
