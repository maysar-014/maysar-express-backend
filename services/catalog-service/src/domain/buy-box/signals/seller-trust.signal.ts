/**
 * Seller Trust Score Signal Computer
 * Requirements 1, 12: composite trust sub-score from identity, age, disputes, compliance.
 */

export interface SellerTrustParams {
  /** Whether the seller has completed identity verification. */
  verifiedIdentity: boolean;
  /** Number of days since the seller account was created. */
  accountAgeDays: number;
  /** Number of formal disputes raised against the seller in the rolling window. */
  disputeHistory: number;
  /** Platform compliance score 0–100 (KYC, regulatory, policy adherence). */
  complianceScore: number;
}

/**
 * Compute the Seller Trust Score (0–100).
 *
 * Weighted blend:
 *   - Verified identity:  35%
 *   - Account age:        25%  (1 year = 100)
 *   - Dispute history:    25%  (each dispute costs 10 points)
 *   - Compliance score:   15%
 */
export function computeSellerTrustScore(params: SellerTrustParams): number {
  const { verifiedIdentity, accountAgeDays, disputeHistory, complianceScore } = params;

  const verifiedIdentityScore = verifiedIdentity ? 100 : 40;
  const accountAgeScore = Math.min(100, (accountAgeDays / 365) * 100);
  const disputeHistoryScore = Math.max(0, 100 - disputeHistory * 10);
  const clampedCompliance = Math.max(0, Math.min(100, complianceScore));

  const score =
    verifiedIdentityScore * 0.35 +
    accountAgeScore * 0.25 +
    disputeHistoryScore * 0.25 +
    clampedCompliance * 0.15;

  return Math.max(0, Math.min(100, score));
}
