/**
 * MerchantContributionEngine (MYS-DEL-001 Article 4.4)
 *
 * Calculates and validates the merchant-funded delivery contribution for a
 * single delivery. This is a SEPARATE funding source from the customer fee
 * and must NEVER be treated as collected until confirmed.
 *
 * The engine is stateless and pure. Verification of whether the contribution
 * has actually been collected is a responsibility of the settlement layer —
 * this engine only calculates what is EXPECTED based on the merchant's
 * commercial arrangement.
 *
 * Contribution types:
 *   FLAT_PER_ORDER      — fixed TZS per order regardless of order value.
 *   PERCENTAGE_OF_ORDER — % of the merchant's order subtotal.
 *   PERCENTAGE_OF_FEE   — % of the customer-facing delivery fee.
 *   CAPPED_PERCENTAGE   — PERCENTAGE_OF_ORDER with a TZS cap.
 *   NONE                — merchant has no contribution arrangement.
 *
 * Pure and stateless: no I/O, no async, no side effects. Deterministic.
 */

export type MerchantContributionType =
  | 'FLAT_PER_ORDER'
  | 'PERCENTAGE_OF_ORDER'
  | 'PERCENTAGE_OF_FEE'
  | 'CAPPED_PERCENTAGE'
  | 'NONE';

export type MerchantContributionStatus =
  | 'EXPECTED'   // calculated but not yet collected
  | 'CONFIRMED'  // collected and reconciled — safe to include in total funding
  | 'WAIVED'     // explicitly waived for this transaction
  | 'ABSENT';    // no arrangement; contribution is zero

/** The commercial arrangement governing this merchant's delivery contribution. */
export interface MerchantContributionPolicy {
  merchantId: string;
  type: MerchantContributionType;
  /** Rate in [0, 1] for percentage types; ignored for FLAT_PER_ORDER and NONE. */
  rate?: number;
  /** Fixed amount in TZS for FLAT_PER_ORDER; cap for CAPPED_PERCENTAGE. */
  amountTzs?: number;
  /** Agreement reference for auditability (contract ID or commercial memo ref). */
  agreementRef?: string;
}

export interface MerchantContributionInput {
  policy: MerchantContributionPolicy;
  /** Order subtotal in TZS (required for PERCENTAGE_OF_ORDER and CAPPED_PERCENTAGE). */
  orderSubtotalTzs?: number;
  /** Customer-facing delivery fee in TZS (required for PERCENTAGE_OF_FEE). */
  customerDeliveryFeeTzs?: number;
}

export interface MerchantContributionResult {
  merchantId: string;
  contributionType: MerchantContributionType;
  /** Expected contribution in TZS. Zero when type is NONE or ABSENT. */
  expectedContributionTzs: number;
  /** Status: EXPECTED until the settlement layer confirms collection. */
  status: MerchantContributionStatus;
  /** Agreement reference from the policy, for the audit trail. */
  agreementRef: string | null;
  /** True when this contribution can be included in total funding calculations.
   *  Only CONFIRMED contributions may be counted (Article 4.4). */
  isCountable: boolean;
  /** Human-readable explanation of how the amount was derived. */
  calculationNote: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export class MerchantContributionEngine {
  /**
   * Calculate the expected merchant contribution for a single delivery.
   * Returns status=EXPECTED — confirmation is a settlement-layer concern.
   */
  compute(input: MerchantContributionInput): MerchantContributionResult {
    const { policy } = input;

    if (policy.type === 'NONE') {
      return this.absent(policy, 'No merchant contribution arrangement.');
    }

    switch (policy.type) {
      case 'FLAT_PER_ORDER': {
        const amount = round2(policy.amountTzs ?? 0);
        if (amount < 0) throw new Error('MerchantContributionEngine: amountTzs cannot be negative');
        return this.expected(policy, amount, `Flat per-order contribution: TZS ${amount}`);
      }

      case 'PERCENTAGE_OF_ORDER': {
        const subtotal = input.orderSubtotalTzs;
        if (subtotal === undefined || subtotal < 0) {
          throw new Error('MerchantContributionEngine: orderSubtotalTzs is required for PERCENTAGE_OF_ORDER');
        }
        const rate = policy.rate ?? 0;
        if (!(rate >= 0 && rate <= 1)) {
          throw new Error(`MerchantContributionEngine: rate must be in [0, 1] (got ${rate})`);
        }
        const amount = round2(subtotal * rate);
        return this.expected(
          policy, amount,
          `${(rate * 100).toFixed(2)}% of order subtotal TZS ${subtotal} = TZS ${amount}`,
        );
      }

      case 'PERCENTAGE_OF_FEE': {
        const fee = input.customerDeliveryFeeTzs;
        if (fee === undefined || fee < 0) {
          throw new Error('MerchantContributionEngine: customerDeliveryFeeTzs is required for PERCENTAGE_OF_FEE');
        }
        const rate = policy.rate ?? 0;
        if (!(rate >= 0 && rate <= 1)) {
          throw new Error(`MerchantContributionEngine: rate must be in [0, 1] (got ${rate})`);
        }
        const amount = round2(fee * rate);
        return this.expected(
          policy, amount,
          `${(rate * 100).toFixed(2)}% of customer delivery fee TZS ${fee} = TZS ${amount}`,
        );
      }

      case 'CAPPED_PERCENTAGE': {
        const subtotal = input.orderSubtotalTzs;
        if (subtotal === undefined || subtotal < 0) {
          throw new Error('MerchantContributionEngine: orderSubtotalTzs is required for CAPPED_PERCENTAGE');
        }
        const rate = policy.rate ?? 0;
        const cap = policy.amountTzs ?? Infinity;
        if (!(rate >= 0 && rate <= 1)) {
          throw new Error(`MerchantContributionEngine: rate must be in [0, 1] (got ${rate})`);
        }
        const uncapped = round2(subtotal * rate);
        const amount = round2(Math.min(uncapped, cap));
        const capNote = amount < uncapped ? ` (capped at TZS ${cap})` : '';
        return this.expected(
          policy, amount,
          `${(rate * 100).toFixed(2)}% of order subtotal TZS ${subtotal} = TZS ${uncapped}${capNote}`,
        );
      }

      default: {
        return this.absent(policy, 'Unknown contribution type — treated as absent.');
      }
    }
  }

  /**
   * Confirm that a contribution has been collected and reconciled.
   * Returns a new result with status=CONFIRMED and isCountable=true.
   * Only the settlement layer should call this after actual collection.
   */
  confirm(result: MerchantContributionResult): MerchantContributionResult {
    if (result.status === 'ABSENT') {
      throw new Error('MerchantContributionEngine: cannot confirm an absent contribution');
    }
    return { ...result, status: 'CONFIRMED', isCountable: true };
  }

  /**
   * Mark a contribution as explicitly waived for this transaction.
   * Amount is preserved for audit but isCountable becomes false.
   */
  waive(result: MerchantContributionResult, reason: string): MerchantContributionResult {
    return {
      ...result,
      status: 'WAIVED',
      isCountable: false,
      calculationNote: `${result.calculationNote} — WAIVED: ${reason}`,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private expected(
    policy: MerchantContributionPolicy,
    amount: number,
    note: string,
  ): MerchantContributionResult {
    return {
      merchantId: policy.merchantId,
      contributionType: policy.type,
      expectedContributionTzs: amount,
      status: 'EXPECTED',
      agreementRef: policy.agreementRef ?? null,
      // EXPECTED contributions must NOT be counted in total funding until confirmed.
      isCountable: false,
      calculationNote: note,
    };
  }

  private absent(
    policy: MerchantContributionPolicy,
    note: string,
  ): MerchantContributionResult {
    return {
      merchantId: policy.merchantId,
      contributionType: 'NONE',
      expectedContributionTzs: 0,
      status: 'ABSENT',
      agreementRef: policy.agreementRef ?? null,
      isCountable: false,
      calculationNote: note,
    };
  }
}
