import { KycEnforcementPolicy } from '../../domain/policies/kyc-enforcement.policy';
import { PrismaKycRepository } from '../../infrastructure/repositories/prisma-kyc.repository';
import { KycNextAction, KycStatus } from '../../domain/types/kyc.types';

export class GetKycStatusUseCase {
  constructor(
    private readonly repository: PrismaKycRepository,
    private readonly policy: KycEnforcementPolicy
  ) {}

  async execute(userId: string): Promise<{
    userId: string;
    kycStatus: KycStatus;
    kycLevel: number;
    limits: {
      maxListings: number;
      maxTransactions: number;
      maxEarnings: number;
    };
    restrictedFeatures: string[];
    nextRequiredAction: KycNextAction;
  }> {
    const snapshot = await this.repository.findUserSnapshot(userId);
    if (!snapshot) {
      throw new Error('User not found');
    }

    const nextRequiredAction = this.resolveNextAction(snapshot.kycStatus, snapshot.kycLevel);
    return {
      userId: snapshot.userId,
      kycStatus: snapshot.kycStatus,
      kycLevel: snapshot.kycLevel,
      limits: {
        maxListings: snapshot.kycLimitMaxListings,
        maxTransactions: snapshot.kycLimitMaxTransactions,
        maxEarnings: snapshot.kycLimitMaxEarnings
      },
      restrictedFeatures: this.policy.getRestrictions(snapshot.kycLevel),
      nextRequiredAction
    };
  }

  private resolveNextAction(status: KycStatus, level: number): KycNextAction {
    if (status === KycStatus.NONE) {
      return 'submit_kyc';
    }
    if (status === KycStatus.PENDING) {
      return 'complete_verification';
    }
    if (status === KycStatus.VERIFIED && level < 3) {
      return 'complete_higher_verification';
    }
    if (status === KycStatus.REJECTED) {
      return 'contact_support';
    }
    return 'none';
  }
}

