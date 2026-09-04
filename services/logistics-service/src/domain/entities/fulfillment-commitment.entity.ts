/**
 * FulfillmentCommitment Entity (Phase 3 §3.4)
 *
 * The absolute price lock created when the buyer confirms checkout. The locked
 * buyerPriceTzs must not change regardless of post-confirmation optimization —
 * any savings the optimizer finds belong to Maysar (recorded as a
 * CONSOLIDATION_SAVING ledger entry), never a surprise buyer credit.
 *
 * State machine (named transitions only):
 *   LOCKED → CONSUMED  (checkout session completed)
 *   LOCKED → EXPIRED   (validity window passed)
 */

export interface FulfillmentCommitmentData {
  id: string;
  checkoutSessionId: string;
  quoteId: string;
  buyerPriceTzs: number;
  pricingVersion: number;
  lockedAt: Date;
  expiresAt: Date;
  status: FulfillmentCommitmentStatus;
}

export type FulfillmentCommitmentStatus = 'LOCKED' | 'CONSUMED' | 'EXPIRED';

const VALID_TRANSITIONS: Record<FulfillmentCommitmentStatus, FulfillmentCommitmentStatus[]> = {
  LOCKED:   ['CONSUMED', 'EXPIRED'],
  CONSUMED: [],
  EXPIRED:  [],
};

export class FulfillmentCommitment {
  private data: FulfillmentCommitmentData;

  constructor(data: FulfillmentCommitmentData) {
    if (!data.checkoutSessionId) throw new Error('FulfillmentCommitment invariant violation: checkoutSessionId is required');
    if (!data.quoteId) throw new Error('FulfillmentCommitment invariant violation: quoteId is required');
    if (!(data.buyerPriceTzs >= 0)) throw new Error('FulfillmentCommitment invariant violation: buyerPriceTzs cannot be negative');
    if (data.expiresAt.getTime() <= data.lockedAt.getTime()) {
      throw new Error('FulfillmentCommitment invariant violation: expiresAt must be after lockedAt');
    }
    this.data = { ...data };
  }

  static create(params: {
    id: string;
    checkoutSessionId: string;
    quoteId: string;
    buyerPriceTzs: number;
    pricingVersion: number;
    expiresAt: Date;
    lockedAt?: Date;
  }): FulfillmentCommitment {
    return new FulfillmentCommitment({
      ...params,
      lockedAt: params.lockedAt ?? new Date(),
      status: 'LOCKED',
    });
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  get id(): string { return this.data.id; }
  get checkoutSessionId(): string { return this.data.checkoutSessionId; }
  get quoteId(): string { return this.data.quoteId; }
  get buyerPriceTzs(): number { return this.data.buyerPriceTzs; }
  get pricingVersion(): number { return this.data.pricingVersion; }
  get lockedAt(): Date { return this.data.lockedAt; }
  get expiresAt(): Date { return this.data.expiresAt; }
  get status(): FulfillmentCommitmentStatus { return this.data.status; }
  get isLocked(): boolean { return this.data.status === 'LOCKED'; }
  get isPastExpiry(): boolean { return Date.now() > this.data.expiresAt.getTime(); }

  // ── State transitions (named methods only) ────────────────────────────────

  /** Checkout session completed — the locked price was honoured. */
  consume(): void {
    this.transitionTo('CONSUMED');
  }

  /** Validity window passed without consumption. */
  expire(): void {
    this.transitionTo('EXPIRED');
  }

  toData(): FulfillmentCommitmentData {
    return { ...this.data };
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private transitionTo(next: FulfillmentCommitmentStatus): void {
    const allowed = VALID_TRANSITIONS[this.data.status];
    if (!allowed.includes(next)) {
      throw new Error(
        `Invalid FulfillmentCommitment transition: ${this.data.status} → ${next}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }
    this.data.status = next;
  }
}