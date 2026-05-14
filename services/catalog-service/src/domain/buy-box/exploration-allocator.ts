/**
 * Buy Box Ranking System — Exploration Allocator
 * Implements controlled seller visibility via exploration slots (Requirement 6).
 */

export interface ExplorationCandidate {
  sellerId: string;
  compositeScore: number;
  hasActiveManipulationPenalty: boolean;
  hasAnomalyFlag: boolean;
}

export class ExplorationAllocator {
  /**
   * Determines whether the current time window should be allocated as an
   * exploration slot rather than a merit-based assignment.
   *
   * @param productId - The product being evaluated (reserved for future use,
   *   e.g. per-product exploration state).
   * @param weeklyWindowCounter - A monotonically increasing counter that
   *   increments each time the Buy Box is re-evaluated within the week.
   * @param explorationBudget - Fraction of windows to allocate for exploration
   *   (0.0–1.0). A value of 0 disables exploration entirely.
   * @returns `true` if this window should be an exploration slot.
   */
  shouldAllocateExplorationSlot(
    productId: string,
    weeklyWindowCounter: number,
    explorationBudget: number,
  ): boolean {
    if (explorationBudget === 0) {
      return false;
    }

    return weeklyWindowCounter % Math.round(1 / explorationBudget) === 0;
  }

  /**
   * Selects the best exploration candidate from the ranked seller list.
   *
   * Eligibility rules:
   * - Not in `recentWinners` (held Buy Box in the preceding 7 days)
   * - No active manipulation penalty
   * - No anomaly flag
   * - Composite score within 15 points of the top score
   *
   * @param rankedSellers - All sellers with their scores and flags.
   * @param recentWinners - Seller IDs that held the Buy Box in the last 7 days.
   * @param topScore - The highest composite score among all ranked sellers.
   * @returns The `sellerId` of the eligible candidate with the highest score,
   *   or `null` if no eligible candidates remain.
   */
  selectExplorationCandidate(
    rankedSellers: ExplorationCandidate[],
    recentWinners: string[],
    topScore: number,
  ): string | null {
    const recentWinnersSet = new Set(recentWinners);

    const candidates = rankedSellers.filter(
      (seller) =>
        !recentWinnersSet.has(seller.sellerId) &&
        !seller.hasActiveManipulationPenalty &&
        !seller.hasAnomalyFlag &&
        seller.compositeScore >= topScore - 15,
    );

    if (candidates.length === 0) {
      return null;
    }

    // Return the candidate with the highest composite score
    const best = candidates.reduce((prev, curr) =>
      curr.compositeScore > prev.compositeScore ? curr : prev,
    );

    return best.sellerId;
  }
}
