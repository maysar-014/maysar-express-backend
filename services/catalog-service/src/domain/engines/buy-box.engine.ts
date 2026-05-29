/**
 * Buy Box Engine
 * 
 * Performance Envelope:
 * - Expected QPS: 50-100 per instance.
 * - Memory Limit: 128MB heap allocation cap.
 * - Indexing Strategy: Assumes B-Tree indexes on catalog_buy_boxes(productId) 
 *   and catalog_buy_box_alternatives(buyBoxId).
 */

import { SellerListingInput } from '../value-objects/seller-listing-input.value-object';
import { BuyBoxWeights } from '../value-objects/buy-box-weights.value-object';
import { BuyBoxResult, BuyBoxAlternative } from '../value-objects/buy-box-result.value-object';
import { AnomalyFlagResult } from '../buy-box/types';

export class BuyBoxEngine {
  /**
   * Computes the Buy Box winner and alternatives for a specific product.
   * 
   * Tie-break logic:
   * 1. Higher Rating (Weight: 0.4)
   * 2. Higher Stock Level (Weight: 0.3)
   * 3. More Recent Update (Weight: 0.3)
   * 
   * @param productId - The unique identifier of the product.
   * @param listings - Array of seller listings available for this product.
   * @param weights - Configuration for price, rating, and availability weighting.
   * @returns A BuyBoxResult with the winner and up to MAX_ALTERNATIVES alternatives, or null if no eligible listings.
   */
  static compute(
    productId: string,
    listings: SellerListingInput[],
    weights: BuyBoxWeights
  ): BuyBoxResult | null {
    const eligible = this.filterEligible(listings, BuyBoxWeights.MATCH_CONFIDENCE_THRESHOLD);
    if (eligible.length === 0) return null;

    const median = this.calculateMedian(eligible.map(l => l.price));
    const anomalyFlags = this.detectAnomalies(eligible, median);
    const scored = eligible.map(listing => ({
      listing,
      score: this.computeFinalScore(listing, median, weights)
    }));

    scored.sort((a, b) => {
      const diff = b.score - a.score;
      return diff !== 0 ? diff : this.applyTieBreaker(a.listing, b.listing);
    });

    const winner = scored[0];
    const alternatives: BuyBoxAlternative[] = scored
      .slice(1, BuyBoxWeights.MAX_ALTERNATIVES + 1)
      .map((s, idx) => ({
        sellerId: s.listing.sellerId,
        score: s.score,
        rank: idx + 2
      }));

    return new BuyBoxResult(
      productId,
      winner.listing.sellerId,
      winner.score,
      alternatives,
      new Date(),
      anomalyFlags
    );
  }

  /**
   * Filters out suspended listings, out-of-stock items, and those below the match confidence threshold.
   * 
   * @param listings - All available listings for the product.
   * @param threshold - Minimum match confidence required to be considered.
   */
  private static filterEligible(listings: SellerListingInput[], threshold: number): SellerListingInput[] {
    return listings.filter(
      l => !l.isSuspended && l.stock > 0 && l.matchConfidence >= threshold
    );
  }

  /**
   * Calculates the median price from a set of numeric values.
   */
  private static calculateMedian(prices: number[]): number {
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  /**
   * Computes a price score (0-100) based on deviation from the median price.
   * 
   * - Minimal deviation (<= 5%) earns a perfect score.
   * - Higher prices are penalized aggressively.
   * - Significantly lower prices (below 90% of median) are also penalized to prevent low-quality lures.
   */
  private static computePriceScore(price: number, median: number): number {
    const deviation = Math.abs(price - median) / median;
    if (deviation <= 0.05) return 100;
    if (price > median) return Math.max(60, 95 - (deviation - 0.05) * 700);
    if (price < median * 0.90) return Math.max(50, 70 - (0.90 - price / median) * 200);
    return 80 + (1 - deviation / 0.05) * 15;
  }

  /**
   * Normalizes a 1-5 rating into a 0-100 score.
   */
  private static computeRatingScore(rating: number): number {
    return (rating / 5) * 100;
  }

  /**
   * Scores availability based on stock levels (linearly up to 10 items).
   */
  private static computeAvailabilityScore(stock: number): number {
    return Math.min(100, stock * 10);
  }

  /**
   * Aggregates price, rating, and availability scores into a final weighted score.
   * Applies additional boosts for new sellers and recent inventory updates.
   */
  private static computeFinalScore(
    listing: SellerListingInput,
    median: number,
    weights: BuyBoxWeights
  ): number {
    let score =
      this.computePriceScore(listing.price, median) * weights.price +
      this.computeRatingScore(listing.rating) * weights.rating +
      this.computeAvailabilityScore(listing.stock) * weights.availability;

    if (listing.isNewSeller) score += BuyBoxWeights.NEW_SELLER_BOOST;
    if (listing.recencyBoost) score += BuyBoxWeights.RECENCY_BOOST;

    return Math.round(score * 100) / 100;
  }

  /**
   * Flags suspicious listing patterns that indicate possible manipulation.
   *
   * The engine has no historical warehouse behind it, so this stays on the
   * safe side with high-confidence heuristics that are stable in production.
   */
  private static detectAnomalies(
    listings: SellerListingInput[],
    medianPrice: number
  ): AnomalyFlagResult[] {
    const flags: AnomalyFlagResult[] = [];
    const seen = new Set<string>();
    const baselineStock = Math.max(1, Math.min(...listings.map((listing) => listing.stock)));

    for (const listing of listings) {
      const stockSpikeThreshold = Math.max(1000, baselineStock * 100);
      if (listing.stock >= stockSpikeThreshold && !seen.has('stockReliability')) {
        seen.add('stockReliability');
        flags.push({
          signalName: 'stockReliability',
          detectedValue: listing.stock,
          expectedMin: baselineStock,
          expectedMax: stockSpikeThreshold,
          substitutedValue: baselineStock,
        });
      }

      const priceDropThreshold = medianPrice * 0.6;
      if (listing.price < priceDropThreshold && !seen.has('priceCompetitiveness')) {
        seen.add('priceCompetitiveness');
        flags.push({
          signalName: 'priceCompetitiveness',
          detectedValue: listing.price,
          expectedMin: priceDropThreshold,
          expectedMax: medianPrice * 1.4,
          substitutedValue: medianPrice,
        });
      }
    }

    return flags;
  }

  /**
   * Resolves ties by comparing ratings, then stock levels, then the last update timestamp.
   */
  private static applyTieBreaker(a: SellerListingInput, b: SellerListingInput): number {
    if (a.rating !== b.rating) return b.rating - a.rating;
    if (a.stock !== b.stock) return b.stock - a.stock;
    return b.lastUpdated.getTime() - a.lastUpdated.getTime();
  }
}
