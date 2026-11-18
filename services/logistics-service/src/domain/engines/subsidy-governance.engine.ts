/**
 * SubsidyGovernanceEngine (MYS-DEL-001 Article 4.5)
 *
 * Manages explicitly authorized delivery subsidies. Replaces the uncontrolled
 * `platformSubsidy` number on PricingBreakdown with a first-class governance
 * record that carries funding source, authorization, purpose, amount and expiry.
 *
 * A subsidy is NOT implicit. It cannot exist without:
 *   1. An identified funding source.
 *   2. A documented authorization reference.
 *   3. A defined purpose.
 *   4. An amount (or a computed amount for COVERAGE_OF_DEFICIT type).
 *   5. An expiry or review condition.
 *
 * The engine is stateless and pure. Persistence of approved subsidies is
 * the responsibility of the application layer.
 *
 * Pure and stateless: no I/O, no async, no side effects. Deterministic.
 */

export type SubsidyFundingSource =
  | 'MAYSAR_PLATFORM'      // Maysar absorbs the cost as a strategic decision
  | 'MERCHANT_PROMOTION'   // A specific merchant funds a customer-facing discount
  | 'COMMERCIAL_PARTNER'   // A third-party partner underwrites the subsidy
  | 'CAMPAIGN';            // A named promotional campaign with its own budget

export type SubsidyPurpose =
  | 'FREE_DELIVERY_PROMOTION'  // buyer sees TZS 0 delivery fee
  | 'DISCOUNTED_DELIVERY'      // buyer sees a reduced (but non-zero) fee
  | 'COVERAGE_OF_DEFICIT'      // subsidy covers a loss-making route
  | 'DRIVER_MINIMUM_TOP_UP'    // extra to meet driver minimum compensation
  | 'NEW_ZONE_LAUNCH';         // below-cost launch pricing for a new area

export interface AuthorizedSubsidy {
  /** Globally unique subsidy authorization ID, used for auditability. */
  authorizationId: string;
  fundingSource: SubsidyFundingSource;
  purpose: SubsidyPurpose;
  /** Maximum subsidy amount in TZS for this authorization. */
  authorizedAmountTzs: number;
  /** Who approved it (operator ID or system authorization reference). */
  authorizedBy: string;
  /** When this authorization was granted. */
  authorizedAt: Date;
  /** Authorization expires at this point; null means it must be reviewed explicitly. */
  expiresAt: Date | null;
  /** Optional reference back to the merchant, campaign or partner record. */
  sourceRef?: string;
}

export interface SubsidyApplicationInput {
  authorization: AuthorizedSubsidy;
  /** The funding deficit in TZS that the subsidy needs to cover.
   *  For COVERAGE_OF_DEFICIT, this is |platformContribution| when negative.
   *  For fixed promotions, pass the full discount amount. */
  deficitTzs: number;
  /** The timestamp at which the quote is being issued — used to validate expiry. */
  issuedAt: Date;
}

export interface SubsidyApplicationResult {
  authorizationId: string;
  fundingSource: SubsidyFundingSource;
  purpose: SubsidyPurpose;
  requestedAmountTzs: number;
  appliedAmountTzs: number;
  /** True when the applied amount fully covers the deficit. */
  coversDeficit: boolean;
  /** True when the subsidy is valid (not expired, not over-authorized). */
  isValid: boolean;
  invalidReason: string | null;
  calculationNote: string;
}

export class SubsidyGovernanceEngine {
  /**
   * Apply an authorized subsidy to a known deficit.
   *
   * Returns an application result with:
   *   - The amount actually applied (min of authorized and requested).
   *   - Whether the deficit is fully covered.
   *   - Validity status (expired, over-limit, or valid).
   */
  apply(input: SubsidyApplicationInput): SubsidyApplicationResult {
    const { authorization: auth, deficitTzs, issuedAt } = input;

    if (deficitTzs < 0) {
      throw new Error('SubsidyGovernanceEngine: deficitTzs cannot be negative');
    }

    // Validate expiry
    if (auth.expiresAt !== null && issuedAt.getTime() > auth.expiresAt.getTime()) {
      return {
        authorizationId: auth.authorizationId,
        fundingSource: auth.fundingSource,
        purpose: auth.purpose,
        requestedAmountTzs: deficitTzs,
        appliedAmountTzs: 0,
        coversDeficit: false,
        isValid: false,
        invalidReason: `Authorization ${auth.authorizationId} expired at ${auth.expiresAt.toISOString()}.`,
        calculationNote: 'Subsidy not applied — authorization expired.',
      };
    }

    // Validate authorized amount
    if (auth.authorizedAmountTzs < 0) {
      return {
        authorizationId: auth.authorizationId,
        fundingSource: auth.fundingSource,
        purpose: auth.purpose,
        requestedAmountTzs: deficitTzs,
        appliedAmountTzs: 0,
        coversDeficit: false,
        isValid: false,
        invalidReason: `Authorization ${auth.authorizationId} has invalid authorizedAmountTzs (< 0).`,
        calculationNote: 'Subsidy not applied — invalid authorization amount.',
      };
    }

    // Apply: cannot apply more than authorized
    const appliedAmountTzs = Math.round(Math.min(deficitTzs, auth.authorizedAmountTzs));
    const coversDeficit = appliedAmountTzs >= Math.round(deficitTzs);

    const sourceNote = auth.sourceRef ? ` (source: ${auth.sourceRef})` : '';
    const coverageNote = coversDeficit
      ? 'Deficit fully covered.'
      : `Partial coverage — residual deficit: TZS ${Math.round(deficitTzs - appliedAmountTzs)}.`;

    return {
      authorizationId: auth.authorizationId,
      fundingSource: auth.fundingSource,
      purpose: auth.purpose,
      requestedAmountTzs: deficitTzs,
      appliedAmountTzs,
      coversDeficit,
      isValid: true,
      invalidReason: null,
      calculationNote:
        `${auth.purpose} — ${auth.fundingSource}${sourceNote}. `
        + `Applied TZS ${appliedAmountTzs} of TZS ${auth.authorizedAmountTzs} authorized. `
        + coverageNote,
    };
  }

  /**
   * Check whether an authorization is currently valid (non-expired and non-negative)
   * without applying it to a specific deficit.
   */
  isValid(auth: AuthorizedSubsidy, asOf: Date): boolean {
    if (auth.authorizedAmountTzs < 0) return false;
    if (auth.expiresAt !== null && asOf.getTime() > auth.expiresAt.getTime()) return false;
    return true;
  }
}
