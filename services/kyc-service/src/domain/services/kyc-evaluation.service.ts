import { AggregatedKycUserData, KycTrigger } from '../types/kyc.types';

export class KycEvaluationService {
  evaluateKycRequirement(userData: AggregatedKycUserData): KycTrigger | null {
    const currentLevel = userData.currentKycLevel ?? 0;

    if (
      currentLevel < 3 &&
      userData.role === 'seller' &&
      userData.totalOrders >= 50
    ) {
      return 'LEVEL_3_REQUIRED';
    }

    if (
      currentLevel < 2 &&
      (userData.walletBalance >= 100000 || userData.totalTransactions >= 10)
    ) {
      return 'LEVEL_2_REQUIRED';
    }

    if (
      currentLevel < 1 &&
      (userData.totalOrders >= 1 || userData.totalListings >= 5)
    ) {
      return 'LEVEL_1_REQUIRED';
    }

    return null;
  }
}

