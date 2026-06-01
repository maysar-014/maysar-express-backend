import { TrustTier, TrustScoreRecord } from '../engines/cod-trust/trust-signal.types';

export interface ICODTrustScoreRepository {
  /**
   * Find the current trust score record for a buyer.
   * Returns null if no record exists (buyer defaults to score 0, tier NEW_BUYER).
   */
  findByBuyerId(buyerId: string): Promise<TrustScoreRecord | null>;

  /**
   * Atomically upsert the trust score and tier for a buyer.
   * Creates the record if it doesn't exist.
   */
  upsert(buyerId: string, score: number, tier: TrustTier): Promise<TrustScoreRecord>;

  // ── Enhanced dual-axis tracking ──────────────────────────────────────────

  /**
   * Increment the buyer's lifetimeCODValue by the given amount (TZS).
   * Called after OrderDeliveryConfirmed for COD orders.
   */
  incrementLifetimeCODValue(buyerId: string, amount: number): Promise<void>;

  /**
   * Decrement the buyer's activeExposure by the given amount (TZS).
   * Called when a COD order reaches a terminal state (delivered, cancelled, refunded).
   */
  decrementActiveExposure(buyerId: string, amount: number): Promise<void>;

  /**
   * Increment the buyer's activeExposure by the given amount (TZS).
   * Called atomically with COD order creation.
   */
  incrementActiveExposure(buyerId: string, amount: number): Promise<void>;

  // ── Dispute window tracking ───────────────────────────────────────────────

  /**
   * Store the dispute window expiry for a delivered COD order.
   * The window is 7 days from the OrderDeliveryConfirmed event.
   */
  setDisputeWindowExpiry(orderId: string, expiresAt: Date): Promise<void>;

  /**
   * Retrieve the dispute window expiry for an order.
   * Returns null if no delivery confirmation has been recorded.
   */
  getDisputeWindowExpiry(orderId: string): Promise<Date | null>;

  /**
   * Mark the lifetimeCODValue increment for an order as suspended.
   * Called when a dispute is raised within the dispute window.
   * The increment is held pending dispute resolution.
   */
  suspendLifetimeCODValueIncrement(orderId: string): Promise<void>;
}
