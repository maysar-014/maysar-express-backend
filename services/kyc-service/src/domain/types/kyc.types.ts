export enum KycStatus {
  NONE = 'none',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

export type KycTrigger = 'LEVEL_1_REQUIRED' | 'LEVEL_2_REQUIRED' | 'LEVEL_3_REQUIRED';
export type KycAction = 'submit' | 'approve' | 'reject' | 'level_change';
export type KycNextAction = 'submit_kyc' | 'complete_verification' | 'complete_higher_verification' | 'contact_support' | 'none';

export interface KycData {
  fullName?: string;
  nationalId?: string;
  businessName?: string;
  documents?: string[];
}

export interface KycLevelLimits {
  maxListings: number;
  maxTransactions: number;
  maxEarnings: number;
}

export interface AggregatedKycUserData {
  userId?: string;
  role: string;
  totalOrders: number;
  totalListings: number;
  walletBalance: number;
  totalTransactions: number;
  currentKycLevel: number;
}

export interface KycSubmissionPayload {
  fullName: string;
  nationalId: string;
  businessName?: string;
  documents?: string[];
}

export interface KycStatusSnapshot {
  userId: string;
  kycStatus: KycStatus;
  kycLevel: number;
  kycSubmittedAt?: Date | null;
  kycVerifiedAt?: Date | null;
  kycData?: KycData | null;
  kycNationalId?: string | null;
  kycLimitMaxListings: number;
  kycLimitMaxTransactions: number;
  kycLimitMaxEarnings: number;
}

export const getKycLimitsForLevel = (level: number): KycLevelLimits => {
  switch (level) {
    case 1:
      return { maxListings: 20, maxTransactions: 50, maxEarnings: 500_000 };
    case 2:
      return { maxListings: 100, maxTransactions: 500, maxEarnings: 5_000_000 };
    case 3:
      return { maxListings: 9999, maxTransactions: 9999, maxEarnings: 50_000_000 };
    case 0:
    default:
      // Level 0: enough to participate in the marketplace and complete first transactions.
      // KYC is prompted after first order — not before.
      return { maxListings: 5, maxTransactions: 10, maxEarnings: 100_000 };
  }
};

