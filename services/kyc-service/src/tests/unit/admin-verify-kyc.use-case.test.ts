/**
 * Unit tests for AdminVerifyKycUseCase
 * Covers idempotent approve behaviour and state machine enforcement
 */

import { AdminVerifyKycUseCase } from '../../application/use-cases/admin-verify-kyc.use-case';
import { KycStatus } from '../../domain/types/kyc.types';

// Mock the shared eventBus so no real Kafka/Redis connection is needed
jest.mock('../../../../../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) }
}));

// Mock prisma to prevent real DB connections
jest.mock('../../infrastructure/database/prisma-client', () => ({
  prisma: {
    notification: {
      create: jest.fn().mockResolvedValue({})
    }
  }
}));

function makeRepository(overrides: Partial<{
  findUserSnapshot: jest.Mock;
  updateKycStatus: jest.Mock;
  createAuditLog: jest.Mock;
}> = {}) {
  return {
    findUserSnapshot: jest.fn(),
    updateKycStatus: jest.fn().mockResolvedValue(undefined),
    createAuditLog: jest.fn().mockResolvedValue(undefined),
    ...overrides
  } as any;
}

describe('AdminVerifyKycUseCase', () => {
  describe('idempotent approve', () => {
    it('returns verified status immediately when KYC is already verified', async () => {
      const repo = makeRepository({
        findUserSnapshot: jest.fn().mockResolvedValue({
          userId: 'usr_seller_001',
          kycStatus: KycStatus.VERIFIED,
          kycLevel: 1,
          kycLimitMaxListings: 10,
          kycLimitMaxTransactions: 100,
          kycLimitMaxEarnings: 10000
        })
      });
      const useCase = new AdminVerifyKycUseCase(repo);

      const result = await useCase.execute({
        userId: 'usr_seller_001',
        action: 'approve',
        adminUserId: 'admin_001'
      });

      expect(result).toEqual({ success: true, status: KycStatus.VERIFIED, level: 1 });
      // No side effects — no DB write, no event emitted
      expect(repo.updateKycStatus).not.toHaveBeenCalled();
      expect(repo.createAuditLog).not.toHaveBeenCalled();
    });

    it('still throws for approve when KYC is rejected (not idempotent)', async () => {
      const repo = makeRepository({
        findUserSnapshot: jest.fn().mockResolvedValue({
          userId: 'usr_seller_002',
          kycStatus: KycStatus.REJECTED,
          kycLevel: 0
        })
      });
      const useCase = new AdminVerifyKycUseCase(repo);

      await expect(useCase.execute({
        userId: 'usr_seller_002',
        action: 'approve',
        adminUserId: 'admin_001'
      })).rejects.toThrow('User KYC must be pending');
    });

    it('still throws for reject when KYC is verified', async () => {
      const repo = makeRepository({
        findUserSnapshot: jest.fn().mockResolvedValue({
          userId: 'usr_seller_003',
          kycStatus: KycStatus.VERIFIED,
          kycLevel: 1
        })
      });
      const useCase = new AdminVerifyKycUseCase(repo);

      await expect(useCase.execute({
        userId: 'usr_seller_003',
        action: 'reject',
        adminUserId: 'admin_001',
        reason: 'fraud'
      })).rejects.toThrow('User KYC must be pending');
    });
  });

  describe('normal approve flow', () => {
    it('approves a pending KYC and returns verified', async () => {
      const repo = makeRepository({
        findUserSnapshot: jest.fn().mockResolvedValue({
          userId: 'usr_seller_004',
          kycStatus: KycStatus.PENDING,
          kycLevel: 0
        })
      });
      const useCase = new AdminVerifyKycUseCase(repo);

      const result = await useCase.execute({
        userId: 'usr_seller_004',
        action: 'approve',
        adminUserId: 'admin_001',
        kycLevel: 1
      });

      expect(result).toEqual({ success: true, status: KycStatus.VERIFIED, level: 1 });
      expect(repo.updateKycStatus).toHaveBeenCalledWith('usr_seller_004', expect.objectContaining({
        status: KycStatus.VERIFIED,
        level: 1
      }));
    });
  });

  describe('normal reject flow', () => {
    it('rejects a pending KYC', async () => {
      const repo = makeRepository({
        findUserSnapshot: jest.fn().mockResolvedValue({
          userId: 'usr_seller_005',
          kycStatus: KycStatus.PENDING,
          kycLevel: 0
        })
      });
      const useCase = new AdminVerifyKycUseCase(repo);

      const result = await useCase.execute({
        userId: 'usr_seller_005',
        action: 'reject',
        adminUserId: 'admin_001',
        reason: 'invalid documents'
      });

      expect(result).toEqual({ success: true, status: KycStatus.REJECTED, level: 0 });
    });
  });

  describe('user not found', () => {
    it('throws when user has no snapshot', async () => {
      const repo = makeRepository({
        findUserSnapshot: jest.fn().mockResolvedValue(null)
      });
      const useCase = new AdminVerifyKycUseCase(repo);

      await expect(useCase.execute({
        userId: 'nonexistent',
        action: 'approve',
        adminUserId: 'admin_001'
      })).rejects.toThrow('User not found');
    });
  });
});
