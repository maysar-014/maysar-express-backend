/**
 * KycEnforcementPolicy
 *
 * Defines what actions are restricted at each KYC level.
 *
 * Design principle: KYC gates FINANCIAL operations, not marketplace participation.
 *
 * Level 0 (no KYC):
 *   - Can browse, chat, place orders (risk managed by COD trust score + payment method)
 *   - Cannot: create more than 5 listings, withdraw funds, access high-value features
 *
 * Level 1 (basic identity):
 *   - Unlocks: more listings (up to 20), moderate transaction volume
 *   - Still cannot: withdraw funds, high-volume operations
 *
 * Level 2 (standard verification):
 *   - Unlocks: wallet withdrawals, higher GMV, larger seller operations
 *
 * Level 3 (full verification):
 *   - Unlocks: financing, enterprise selling, high-risk categories, unlimited volume
 */
export class KycEnforcementPolicy {
  getRestrictions(kycLevel: number): string[] {
    const restrictions: string[] = [];

    // Level 0: limited listings (but NOT blocked from placing orders)
    if (kycLevel < 1) {
      restrictions.push('create_more_listings');
    }

    // Level 1: cannot withdraw funds or access high-GMV features
    if (kycLevel < 2) {
      restrictions.push('withdraw_funds');
      restrictions.push('high_gmv_operations');
    }

    // Level 2: cannot access financing, enterprise features, or high-risk categories
    if (kycLevel < 3) {
      restrictions.push('financing');
      restrictions.push('enterprise_selling');
      restrictions.push('high_risk_categories');
    }

    return restrictions;
  }

  canPerformAction(kycLevel: number, action: string): boolean {
    return !this.getRestrictions(kycLevel).includes(action);
  }
}

