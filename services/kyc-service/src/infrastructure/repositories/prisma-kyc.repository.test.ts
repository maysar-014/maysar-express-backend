import { User_KycStatus } from '@prisma/client';
import { PrismaKycRepository } from './prisma-kyc.repository';

describe('PrismaKycRepository', () => {
  it('reads snapshots and aggregates user data', async () => {
    const prisma = {
      user_User: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn()
      },
      order_Order: { count: jest.fn() },
      enabler_ProductListing: { count: jest.fn() },
      wallet_Wallet: { aggregate: jest.fn() },
      wallet_Transaction: { count: jest.fn() },
      kyc_AuditLog: { create: jest.fn() }
    };
    prisma.user_User.findUnique
      .mockResolvedValueOnce({
        id: 'user-1',
        kycStatus: 'verified',
        kycLevel: 2,
        kycSubmittedAt: new Date('2026-05-01T00:00:00.000Z'),
        kycVerifiedAt: new Date('2026-05-02T00:00:00.000Z'),
        kycData: { nationalId: 'NID-1' },
        kycNationalId: 'NID-1',
        kycLimitMaxListings: 10,
        kycLimitMaxTransactions: 5,
        kycLimitMaxEarnings: '2000'
      })
      .mockResolvedValueOnce({
        role: 'seller',
        kycLevel: 2
      });
    prisma.user_User.findFirst.mockResolvedValueOnce({ id: 'user-2' });
    prisma.order_Order.count.mockResolvedValueOnce(4);
    prisma.enabler_ProductListing.count.mockResolvedValueOnce(3);
    prisma.wallet_Wallet.aggregate.mockResolvedValueOnce({ _sum: { balance: 1500 } });
    prisma.wallet_Transaction.count.mockResolvedValueOnce(6);

    const repository = new PrismaKycRepository();

    const snapshot = await repository.findUserSnapshot('user-1');
    const byNationalId = await repository.findByNationalId('NID-1', 'user-3');
    const aggregated = await repository.getAggregatedUserData('user-1');
    await repository.submitKyc('user-1', { nationalId: 'NID-1', country: 'TZ' } as never);
    await repository.updateKycStatus('user-1', {
      status: 'verified' as never,
      level: 3,
      submittedAt: new Date('2026-05-03T00:00:00.000Z'),
      verifiedAt: new Date('2026-05-04T00:00:00.000Z'),
      nationalId: 'NID-2',
      kycData: { nationalId: 'NID-2' } as never
    });
    await repository.createAuditLog({
      userId: 'user-1',
      action: 'verify',
      previousLevel: 2,
      newLevel: 3,
      previousStatus: 'pending',
      newStatus: 'verified',
      performedBy: 'admin-1',
      reason: 'manual review',
      metadata: { source: 'test' }
    });

    expect(snapshot).toEqual({
      userId: 'user-1',
      kycStatus: 'verified',
      kycLevel: 2,
      kycSubmittedAt: new Date('2026-05-01T00:00:00.000Z'),
      kycVerifiedAt: new Date('2026-05-02T00:00:00.000Z'),
      kycData: { nationalId: 'NID-1' },
      kycNationalId: 'NID-1',
      kycLimitMaxListings: 10,
      kycLimitMaxTransactions: 5,
      kycLimitMaxEarnings: 2000
    });
    expect(byNationalId).toEqual({ id: 'user-2' });
    expect(aggregated).toEqual({
      userId: 'user-1',
      role: 'seller',
      totalOrders: 4,
      totalListings: 3,
      walletBalance: 1500,
      totalTransactions: 6,
      currentKycLevel: 2
    });
    expect(prisma.user_User.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          kycStatus: User_KycStatus.PENDING,
          kycNationalId: 'NID-1'
        })
      })
    );
    expect(prisma.kyc_AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'verify',
          previousLevel: 2,
          newLevel: 3
        })
      })
    );
  });
});
