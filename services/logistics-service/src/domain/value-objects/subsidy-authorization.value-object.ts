/**
 * SubsidyAuthorization Value Object (MYS-DEL-001 Articles 4.5, 5.1, 44)
 *
 * Every approved delivery subsidy must have a defined funding source, purpose,
 * amount, authorization record, and expiry or review condition.
 *
 * The constitution explicitly prohibits:
 *   - Hiding subsidies inside customer pricing (Article 7).
 *   - Treating a non-zero `platformSubsidy` field as an implicit approval.
 *   - Using subsidies from unnamed or undocumented sources.
 *   - Subsidies without an expiry or review condition (Article 4.5).
 *
 * Usage: a SubsidyAuthorization is attached to a QuoteData at quote time
 * when the customer price is below the calculated fulfillment cost.
 * The FinancialFeasibilityEngine reads it to determine whether a
 * funding deficit is explicitly covered or constitutes an unauthorized loss.
 *
 * Pure value object: immutable after construction.
 */

export type SubsidyFundingSource =
  | 'MAYSAR_PLATFORM'       // Maysar absorbs this cost as a business decision
  | 'MERCHANT_PROMOTION'    // Merchant-funded delivery promotion
  | 'PARTNER_CAMPAIGN'      // External commercial partner funds it
  | 'INVESTOR_GROWTH'       // Growth-phase subsidy from investor capital
  | 'REGULATORY_REQUIREMENT'; // Regulatory obligation (e.g. price-controlled route)

export type SubsidyStatus =
  | 'ACTIVE'    // within the approved window, may be applied
  | 'EXPIRED'   // past the expiry date — cannot be applied to new quotes
  | 'EXHAUSTED' // budget fully consumed
  | 'REVOKED';  // withdrawn before expiry by the approving authority

export interface SubsidyAuthorizationData {
  /** Unique identifier for this authorization record. */
  authorizationId: string;
  /** Where the subsidy funding comes from. */
  fundingSource: SubsidyFundingSource;
  /** Human-readable description of the business reason. */
  purpose: string;
  /** Maximum amount that may be applied per delivery transaction (TZS). */
  maxAmountPerDeliveryTzs: number;
  /** Total budget available across all transactions (null = unlimited within window). */
  totalBudgetTzs: number | null;
  /** Amount consumed so far (TZS). */
  consumedTzs: number;
  /** The user or system role that approved this subsidy. */
  approvedBy: string;
  /** Timestamp of approval. */
  approvedAt: Date;
  /** Hard expiry: the subsidy cannot be applied after this date. */
  expiresAt: Date;
  /** Current status. */
  status: SubsidyStatus;
  /** Delivery strategies this authorization covers (empty = all strategies). */
  applicableStrategies: string[];
  /** Geographic zones this authorization covers (empty = all zones). */
  applicableZones: string[];
}

const VALID_FUNDING_SOURCES: SubsidyFundingSource[] = [
  'MAYSAR_PLATFORM', 'MERCHANT_PROMOTION', 'PARTNER_CAMPAIGN',
  'INVESTOR_GROWTH', 'REGULATORY_REQUIREMENT',
];

export class SubsidyAuthorization {
  private readonly data: SubsidyAuthorizationData;

  constructor(data: SubsidyAuthorizationData) {
    if (!data.authorizationId?.trim()) {
      throw new Error('SubsidyAuthorization: authorizationId is required');
    }
    if (!VALID_FUNDING_SOURCES.includes(data.fundingSource)) {
      throw new Error(`SubsidyAuthorization: unknown fundingSource '${data.fundingSource}'`);
    }
    if (!data.purpose?.trim()) {
      throw new Error('SubsidyAuthorization: purpose is required (Article 4.5)');
    }
    if (!(data.maxAmountPerDeliveryTzs >= 0)) {
      throw new Error('SubsidyAuthorization: maxAmountPerDeliveryTzs cannot be negative');
    }
    if (!Number.isFinite(data.maxAmountPerDeliveryTzs)) {
      throw new Error('SubsidyAuthorization: maxAmountPerDeliveryTzs must be a finite number');
    }
    if (!data.approvedBy?.trim()) {
      throw new Error('SubsidyAuthorization: approvedBy is required — subsidies require an authorization record (Article 4.5)');
    }
    if (!(data.expiresAt > data.approvedAt)) {
      throw new Error('SubsidyAuthorization: expiresAt must be after approvedAt');
    }
    if (!(data.consumedTzs >= 0)) {
      throw new Error('SubsidyAuthorization: consumedTzs cannot be negative');
    }
    this.data = { ...data };
  }

  static create(params: {
    authorizationId: string;
    fundingSource: SubsidyFundingSource;
    purpose: string;
    maxAmountPerDeliveryTzs: number;
    totalBudgetTzs?: number | null;
    approvedBy: string;
    approvedAt?: Date;
    expiresAt: Date;
    applicableStrategies?: string[];
    applicableZones?: string[];
  }): SubsidyAuthorization {
    const approvedAt = params.approvedAt ?? new Date();
    return new SubsidyAuthorization({
      authorizationId: params.authorizationId,
      fundingSource: params.fundingSource,
      purpose: params.purpose,
      maxAmountPerDeliveryTzs: params.maxAmountPerDeliveryTzs,
      totalBudgetTzs: params.totalBudgetTzs ?? null,
      consumedTzs: 0,
      approvedBy: params.approvedBy,
      approvedAt,
      expiresAt: params.expiresAt,
      status: 'ACTIVE',
      applicableStrategies: params.applicableStrategies ?? [],
      applicableZones: params.applicableZones ?? [],
    });
  }

  /** Sentinel representing "no subsidy" — used when total funding covers total cost. */
  static none(): SubsidyAuthorization {
    const now = new Date();
    const future = new Date(now.getTime() + 1000);
    return new SubsidyAuthorization({
      authorizationId: 'NO_SUBSIDY',
      fundingSource: 'MAYSAR_PLATFORM',
      purpose: 'No subsidy required — delivery is self-funding',
      maxAmountPerDeliveryTzs: 0,
      totalBudgetTzs: 0,
      consumedTzs: 0,
      approvedBy: 'SYSTEM',
      approvedAt: now,
      expiresAt: future,
      status: 'ACTIVE',
      applicableStrategies: [],
      applicableZones: [],
    });
  }

  get authorizationId(): string { return this.data.authorizationId; }
  get fundingSource(): SubsidyFundingSource { return this.data.fundingSource; }
  get purpose(): string { return this.data.purpose; }
  get maxAmountPerDeliveryTzs(): number { return this.data.maxAmountPerDeliveryTzs; }
  get totalBudgetTzs(): number | null { return this.data.totalBudgetTzs; }
  get consumedTzs(): number { return this.data.consumedTzs; }
  get approvedBy(): string { return this.data.approvedBy; }
  get approvedAt(): Date { return this.data.approvedAt; }
  get expiresAt(): Date { return this.data.expiresAt; }
  get status(): SubsidyStatus { return this.data.status; }
  get applicableStrategies(): string[] { return [...this.data.applicableStrategies]; }
  get applicableZones(): string[] { return [...this.data.applicableZones]; }

  /** Whether this authorization can currently be applied to a new quote. */
  get isApplicable(): boolean {
    if (this.data.status !== 'ACTIVE') return false;
    if (Date.now() >= this.data.expiresAt.getTime()) return false;
    if (this.data.totalBudgetTzs !== null) {
      const remaining = this.data.totalBudgetTzs - this.data.consumedTzs;
      if (remaining <= 0) return false;
    }
    return true;
  }

  /**
   * Maximum amount this authorization can contribute to a specific delivery,
   * accounting for per-delivery cap and remaining budget.
   */
  maxApplicableAmount(requestedTzs: number): number {
    if (!this.isApplicable) return 0;
    let cap = this.data.maxAmountPerDeliveryTzs;
    if (this.data.totalBudgetTzs !== null) {
      const remaining = this.data.totalBudgetTzs - this.data.consumedTzs;
      cap = Math.min(cap, remaining);
    }
    return Math.min(requestedTzs, cap);
  }

  /**
   * Whether this authorization covers a given delivery strategy and zone.
   * An empty allow-list means "all".
   */
  covers(strategy: string, zone: string): boolean {
    const strategyOk =
      this.data.applicableStrategies.length === 0 ||
      this.data.applicableStrategies.includes(strategy);
    const zoneOk =
      this.data.applicableZones.length === 0 ||
      this.data.applicableZones.includes(zone);
    return strategyOk && zoneOk;
  }

  toData(): SubsidyAuthorizationData {
    return { ...this.data };
  }
}
