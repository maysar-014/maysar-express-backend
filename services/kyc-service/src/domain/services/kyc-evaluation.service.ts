import { AggregatedKycUserData, KycTrigger } from '../types/kyc.types';

/**
 * KycEvaluationService
 *
 * Determines when to prompt a user to upgrade their KYC level based on activity.
 * KYC is NOT a gate for basic marketplace access — it is a progressive unlock
 * for higher-value financial operations.
 *
 * Separation of concerns:
 *   - Order placement: governed by COD trust score + payment method risk (no KYC gate)
 *   - Wallet withdrawals: KYC level 2 required
 *   - High-volume selling / financing: KYC level 3 required
 *   - Basic marketplace participation: no KYC required
 *
 * Trigger logic (prompts user to submit KYC — does NOT block them):
 *   Level 1: after first successful order OR 5+ listings (user has demonstrated intent)
 *   Level 2: wallet balance ≥ TZS 100,000 OR 10+ transactions (financial activity)
 *   Level 3: seller with 50+ orders (high-volume commercial activity)
 */
export class KycEvaluationService {
  evaluateKycRequirement(userData: AggregatedKycUserData): KycTrigger | null {
    const currentLevel = userData.currentKycLevel ?? 0;

    // Level 3: high-volume sellers need full business verification
    if (
      currentLevel < 3 &&
      userData.role === 'seller' &&
      userData.totalOrders >= 50
    ) {
      return 'LEVEL_3_REQUIRED';
    }

    // Level 2: significant financial activity — needed to withdraw funds
    if (
      currentLevel < 2 &&
      (userData.walletBalance >= 100_000 || userData.totalTransactions >= 10)
    ) {
      return 'LEVEL_2_REQUIRED';
    }

    // Level 1: first meaningful marketplace activity — gentle nudge, not a block
    // Note: this triggers AFTER the first order succeeds, not before.
    // The order placement itself has no KYC requirement.
    if (
      currentLevel < 1 &&
      (userData.totalOrders >= 1 || userData.totalListings >= 5)
    ) {
      return 'LEVEL_1_REQUIRED';
    }

    return null;
  }
}

