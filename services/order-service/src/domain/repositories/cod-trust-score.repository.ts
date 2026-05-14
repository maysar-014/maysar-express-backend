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
}
