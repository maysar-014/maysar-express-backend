const mockPrisma = {
  enabler_Profile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined)
  }
};

jest.mock('../database/prisma-client', () => ({
  __esModule: true,
  default: mockPrisma
}));

import { Enabler_Status } from '../../domain/types/enabler.types';
import { PrismaEnablerRepository } from './prisma-enabler.repository';

describe('PrismaEnablerRepository', () => {
  const makeRecord = () => ({
    id: 'e1',
    userId: 'u1',
    businessName: 'Biz',
    contactEmail: 'biz@example.com',
    contactPhone: null,
    businessDescription: null,
    status: Enabler_Status.PENDING,
    verificationStatus: 'PENDING',
    tier: 'BRONZE',
    commissionRate: '0.15',
    totalSales: '1000',
    totalOrders: 2,
    conversionRate: '0.05',
    customerRating: null,
    totalCommissionEarned: '100',
    taxId: null,
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    metadata: null,
    createdAt: new Date('2026-03-09T00:00:00.000Z'),
    updatedAt: new Date('2026-03-09T00:00:00.000Z')
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('find methods map records and handle null', async () => {
    mockPrisma.enabler_Profile.findUnique
      .mockResolvedValueOnce(makeRecord())
      .mockResolvedValueOnce(null);
    mockPrisma.enabler_Profile.findMany.mockResolvedValue([makeRecord()]);
    const repo = new PrismaEnablerRepository();

    const byId = await repo.findById('e1');
    const byUser = await repo.findByUserId('u1');
    const byStatus = await repo.findByStatus(Enabler_Status.PENDING);

    expect(byId?.id).toBe('e1');
    expect(byUser).toBeNull();
    expect(byStatus).toHaveLength(1);
  });

  it('save and update delegate with transformed payload', async () => {
    const repo = new PrismaEnablerRepository();
    const enabler = {
      toPlainObject: () => ({
        id: 'e1',
        userId: 'u1',
        businessName: 'Biz',
        contactEmail: 'biz@example.com',
        contactPhone: null,
        businessDescription: null,
        status: Enabler_Status.PENDING,
        verificationStatus: 'PENDING',
        tier: 'BRONZE',
        commissionRate: 0.15,
        totalSales: 1000,
        totalOrders: 2,
        conversionRate: 0.05,
        customerRating: null,
        totalCommissionEarned: 100,
        taxId: null,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        metadata: null,
        createdAt: new Date('2026-03-09T00:00:00.000Z'),
        updatedAt: new Date('2026-03-09T00:00:00.000Z')
      })
    };

    await repo.save(enabler as any);
    await repo.update(enabler as any);

    expect(mockPrisma.enabler_Profile.create).toHaveBeenCalled();
    expect(mockPrisma.enabler_Profile.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: expect.objectContaining({
        status: Enabler_Status.PENDING,
        updatedAt: expect.any(Date)
      })
    });
  });
});
