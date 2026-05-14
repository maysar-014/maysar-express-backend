/**
 * Buy Box Ranking Repository Interface
 * Domain layer contract for all Buy Box ranking persistence operations.
 */

import {
  CategoryStrategy,
  GeographicZone,
  ScoreSnapshotInput,
  SellerOffer,
  SellerSignalData,
  SignalValues,
} from '../types';

export interface BuyBoxRankingRepository {
  /**
   * Fetch all raw signal data for a seller's offer on a product.
   * Includes zone-specific delivery data when zone is provided.
   */
  getSellerSignalData(
    sellerId: string,
    productId: string,
    zone?: GeographicZone
  ): Promise<SellerSignalData>;

  /**
   * Load the category strategy for a given category.
   * Returns null when no custom strategy is configured (caller should use DEFAULT_STRATEGY_WEIGHTS).
   */
  getCategoryStrategy(categoryId: string): Promise<CategoryStrategy | null>;

  /**
   * Persist an immutable score snapshot for audit purposes.
   */
  saveScoreSnapshot(snapshot: ScoreSnapshotInput): Promise<void>;

  /**
   * Upsert the Buy Box winner and replace the alternatives list for a product.
   * Must be executed in a single transaction.
   */
  saveBuyBoxWinner(
    productId: string,
    winnerId: string,
    compositeScore: number,
    assignmentType: 'MERIT' | 'EXPLORATION',
    alternatives: Array<{ sellerId: string; compositeScore: number; rank: number }>
  ): Promise<void>;

  /**
   * Return the active operator override for a product, if any.
   * An override is active when startAt <= now AND (endAt IS NULL OR endAt > now).
   */
  getActiveOverride(
    productId: string
  ): Promise<{ sellerId: string; operatorId: string; reason: string } | null>;

  /**
   * Return uncleared anomaly flags for a seller within the given time window.
   */
  getAnomalyFlags(
    sellerId: string,
    withinDays: number
  ): Promise<Array<{ signalName: string; flaggedAt: Date }>>;

  /**
   * Return zone-specific delivery performance for a seller.
   * Returns null when fewer than 5 fulfilled orders exist in the zone.
   */
  getZonePerformance(
    sellerId: string,
    zone: GeographicZone
  ): Promise<{ deliverySuccessRate: number; avgDeliveryDays: number; orderCount: number } | null>;

  /**
   * Return platform-wide category averages for Bayesian prior computation.
   */
  getPlatformCategoryAverages(categoryId: string): Promise<Partial<SignalValues>>;

  /**
   * Return all eligible seller offers for a product.
   * Eligible = account active, stock > 0.
   */
  getEligibleSellerOffers(productId: string): Promise<SellerOffer[]>;

  /**
   * Return seller IDs that held the Buy Box for a product within the given window.
   * Used by the exploration allocator to enforce rotation.
   */
  getRecentBuyBoxWinners(productId: string, withinDays: number): Promise<string[]>;

  /**
   * Return the current Buy Box winner seller ID for a product, if any.
   */
  getCurrentBuyBoxWinner(productId: string): Promise<string | null>;

  /**
   * Clear the Buy Box assignment for a product (e.g. when all sellers are disqualified).
   */
  clearBuyBox(productId: string): Promise<void>;

  /**
   * Persist an anomaly flag record.
   */
  saveAnomalyFlag(flag: {
    sellerId: string;
    signalName: string;
    detectedValue: number;
    expectedMin: number;
    expectedMax: number;
    flaggedAt: Date;
  }): Promise<void>;

  /**
   * Clear an anomaly flag (operator review action).
   */
  clearAnomalyFlag(flagId: string, operatorId: string, clearedAt: Date): Promise<void>;

  /**
   * Write an operator audit log entry.
   */
  writeOperatorAuditLog(entry: {
    operatorId: string;
    entityType: string;
    entityId: string;
    field: string;
    previousValue?: unknown;
    newValue?: unknown;
    changedAt: Date;
  }): Promise<void>;

  /**
   * Upsert zone performance after a delivery event.
   */
  upsertZonePerformance(
    sellerId: string,
    zone: GeographicZone,
    deliverySuccessRate: number,
    avgDeliveryDays: number,
    orderCount: number
  ): Promise<void>;

  /**
   * Return all score snapshots for a product in descending computedAt order.
   */
  getScoreSnapshots(productId: string): Promise<ScoreSnapshotInput[]>;

  /**
   * Upsert a Buy Box operator override for a product.
   */
  upsertBuyBoxOverride(override: {
    productId: string;
    sellerId: string;
    operatorId: string;
    reason: string;
    startAt: Date;
    endAt?: Date;
  }): Promise<void>;
}
