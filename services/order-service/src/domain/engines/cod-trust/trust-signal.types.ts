export enum TrustSignalType {
  // ── Positive signals ───────────────────────────────────────────────────────
  SUCCESSFUL_DELIVERY        = 'SUCCESSFUL_DELIVERY',        // +8
  PHONE_VERIFIED             = 'PHONE_VERIFIED',             // +5
  HIGH_VALUE_COMPLETION      = 'HIGH_VALUE_COMPLETION',      // +10
  ACCOUNT_AGE_MILESTONE      = 'ACCOUNT_AGE_MILESTONE',      // +7

  // ── Negative signals — buyer ───────────────────────────────────────────────
  POST_DISPATCH_CANCELLATION = 'POST_DISPATCH_CANCELLATION', // -10
  DELIVERY_REFUSED           = 'DELIVERY_REFUSED',           // -15
  DISPUTE_LOST               = 'DISPUTE_LOST',               // -12

  /**
   * @deprecated Use structured courier sub-types instead.
   * Kept for backward-compatible replay of historical Score_Events.
   * Maps to COURIER_UNREACHABLE_CUSTOMER weight (-5) during replay.
   */
  COURIER_NEGATIVE_REPORT    = 'COURIER_NEGATIVE_REPORT',    // -8 (legacy)

  // ── Structured courier intelligence signals ────────────────────────────────
  COURIER_UNREACHABLE_CUSTOMER = 'COURIER_UNREACHABLE_CUSTOMER', // -5
  COURIER_SUSPICIOUS_ADDRESS   = 'COURIER_SUSPICIOUS_ADDRESS',   // -10
  COURIER_REPEATED_REFUSAL     = 'COURIER_REPEATED_REFUSAL',     // -20
  COURIER_FAKE_PHONE           = 'COURIER_FAKE_PHONE',           // -12

  // ── Seller-side signals (no buyer score delta — tracked in seller risk tables)
  SELLER_WRONG_ITEM_SHIPPED  = 'SELLER_WRONG_ITEM_SHIPPED',  // 0
  SELLER_EMPTY_PACKAGE       = 'SELLER_EMPTY_PACKAGE',       // 0
}

/** Five-tier trust progression. Tier is derived from both score AND lifetimeCODValue. */
export type TrustTier =
  | 'NEW_BUYER'
  | 'TRUSTED_BEGINNER'
  | 'TRUSTED_BUYER'
  | 'GOLD_BUYER'
  | 'PLATINUM_BUYER';

export const SIGNAL_WEIGHTS: Record<TrustSignalType, number> = {
  // Positive
  [TrustSignalType.SUCCESSFUL_DELIVERY]:          +8,
  [TrustSignalType.PHONE_VERIFIED]:               +5,
  [TrustSignalType.HIGH_VALUE_COMPLETION]:        +10,
  [TrustSignalType.ACCOUNT_AGE_MILESTONE]:        +7,
  // Negative — buyer
  [TrustSignalType.POST_DISPATCH_CANCELLATION]:   -10,
  [TrustSignalType.DELIVERY_REFUSED]:             -15,
  [TrustSignalType.DISPUTE_LOST]:                 -12,
  // Legacy courier signal (kept for replay compatibility)
  [TrustSignalType.COURIER_NEGATIVE_REPORT]:      -8,
  // Structured courier sub-types
  [TrustSignalType.COURIER_UNREACHABLE_CUSTOMER]: -5,
  [TrustSignalType.COURIER_SUSPICIOUS_ADDRESS]:   -10,
  [TrustSignalType.COURIER_REPEATED_REFUSAL]:     -20,
  [TrustSignalType.COURIER_FAKE_PHONE]:           -12,
  // Seller signals — no buyer score delta
  [TrustSignalType.SELLER_WRONG_ITEM_SHIPPED]:    0,
  [TrustSignalType.SELLER_EMPTY_PACKAGE]:         0,
};

export interface TrustScoreRecord {
  buyerId:          string;
  score:            number;
  tier:             TrustTier;
  /** Cumulative value (TZS) of all OTP-confirmed COD orders. Used for dual-axis tier derivation. */
  lifetimeCODValue: number;
  /** Sum of active (undelivered) COD order values (TZS). Enforces exposure limits. */
  activeExposure:   number;
  updatedAt:        Date;
  createdAt:        Date;
}

export interface ScoreEventRecord {
  id:             string;
  buyerId:        string;
  signalType:     TrustSignalType;
  delta:          number;
  scoreBefore:    number;
  scoreAfter:     number;
  sourceService:  string;
  sourceEntityId: string;
  /** Confirmation method for SUCCESSFUL_DELIVERY events. */
  confirmationMethod?: string;
  createdAt:      Date;
}

export interface RestrictionRecord {
  id:        string;
  buyerId:   string;
  reason:    string;
  startAt:   Date;
  endsAt:    Date;
  permanent: boolean;
  createdAt: Date;
}
