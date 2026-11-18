/**
 * MerchantContribution Value Object (MYS-DEL-001 Articles 4.4, 5.1, 16–17)
 *
 * Represents a merchant-funded delivery contribution: an explicitly agreed,
 * commercially documented amount that reduces the net delivery cost borne by
 * the buyer or the platform.
 *
 * Key invariants from the constitution:
 *   - The contribution MUST have an agreement reference — undisclosed charges
 *     are prohibited (Article 17).
 *   - The status MUST be CONFIRMED before the amount is included in
 *     Total Delivery Funding (Article 5.1).  EXPECTED contributions are
 *     recorded for visibility but never counted as collected revenue.
 *   - The amount CANNOT be negative.
 *   - The currency must match the delivery transaction currency (TZS).
 *
 * This is a pure value object: immutable after construction.
 */

export type MerchantContributionStatus =
  | 'EXPECTED'    // agreed in principle but not yet confirmed/collected
  | 'CONFIRMED'   // confirmed and eligible to be counted in total funding
  | 'COLLECTED'   // cash or digital payment received and reconciled
  | 'WAIVED'      // seller waived the contribution for this transaction
  | 'DISPUTED'    // contribution is under dispute; treat as zero for settlement
  | 'FAILED';     // collection failed; must not be counted in funding

export interface MerchantContributionData {
  /** Merchant / seller identifier. */
  merchantId: string;
  /** Amount in TZS. Must be >= 0. */
  amountTzs: number;
  /** Current lifecycle status. Only CONFIRMED and COLLECTED count toward funding. */
  status: MerchantContributionStatus;
  /**
   * Reference to the commercial agreement, contract, or promotion that
   * authorises this contribution. Required — undisclosed contributions
   * are prohibited by Article 17.
   */
  agreementReference: string;
  /** Optional: the specific promotion or campaign driving this contribution. */
  promotionId?: string;
  /** Timestamp when the contribution was last confirmed or updated. */
  confirmedAt?: Date;
}

const COUNTABLE_STATUSES: MerchantContributionStatus[] = ['CONFIRMED', 'COLLECTED'];
const VALID_STATUSES: MerchantContributionStatus[] = [
  'EXPECTED', 'CONFIRMED', 'COLLECTED', 'WAIVED', 'DISPUTED', 'FAILED',
];

export class MerchantContribution {
  private readonly data: MerchantContributionData;

  constructor(data: MerchantContributionData) {
    if (!data.merchantId?.trim()) {
      throw new Error('MerchantContribution: merchantId is required');
    }
    if (!(data.amountTzs >= 0)) {
      throw new Error(`MerchantContribution: amountTzs cannot be negative (got ${data.amountTzs})`);
    }
    if (!Number.isFinite(data.amountTzs)) {
      throw new Error('MerchantContribution: amountTzs must be a finite number');
    }
    if (!VALID_STATUSES.includes(data.status)) {
      throw new Error(`MerchantContribution: unknown status '${data.status}'`);
    }
    if (!data.agreementReference?.trim()) {
      throw new Error(
        'MerchantContribution: agreementReference is required. ' +
        'Undisclosed merchant contributions are prohibited (MYS-DEL-001 Article 17).',
      );
    }
    this.data = { ...data };
  }

  static create(params: {
    merchantId: string;
    amountTzs: number;
    agreementReference: string;
    promotionId?: string;
    status?: MerchantContributionStatus;
  }): MerchantContribution {
    return new MerchantContribution({
      merchantId: params.merchantId,
      amountTzs: params.amountTzs,
      agreementReference: params.agreementReference,
      promotionId: params.promotionId,
      status: params.status ?? 'EXPECTED',
    });
  }

  /** Create a zero-contribution placeholder when no merchant support applies. */
  static none(): MerchantContribution {
    return new MerchantContribution({
      merchantId: 'NONE',
      amountTzs: 0,
      status: 'WAIVED',
      agreementReference: 'NO_MERCHANT_CONTRIBUTION',
    });
  }

  get merchantId(): string { return this.data.merchantId; }
  get amountTzs(): number { return this.data.amountTzs; }
  get status(): MerchantContributionStatus { return this.data.status; }
  get agreementReference(): string { return this.data.agreementReference; }
  get promotionId(): string | undefined { return this.data.promotionId; }
  get confirmedAt(): Date | undefined { return this.data.confirmedAt; }

  /**
   * Whether this contribution counts toward Total Delivery Funding.
   * Only CONFIRMED and COLLECTED amounts are eligible (Article 5.1).
   * EXPECTED contributions must never inflate revenue figures.
   */
  get isCountable(): boolean {
    return COUNTABLE_STATUSES.includes(this.data.status) && this.data.amountTzs > 0;
  }

  /**
   * The amount eligible to count toward Total Delivery Funding.
   * Returns 0 for EXPECTED, WAIVED, DISPUTED, or FAILED contributions.
   */
  get countableAmountTzs(): number {
    return this.isCountable ? this.data.amountTzs : 0;
  }

  toData(): MerchantContributionData {
    return { ...this.data };
  }
}
