/**
 * Compute Buy Box Ranking Use Case
 * Orchestrates the full Buy Box ranking pipeline: override check, strategy load,
 * winner selection, exploration allocation, persistence, and audit snapshot.
 *
 * Requirements: 10, 11, 13
 */

import { RankingEngine } from '../../domain/buy-box/ranking-engine';
import { CategoryStrategyService } from '../../domain/buy-box/category-strategy.service';
import { ExplorationAllocator } from '../../domain/buy-box/exploration-allocator';
import { BuyBoxRankingRepository } from '../../domain/buy-box/repositories/buy-box-ranking.repository.interface';
import { BuyBoxContext } from '../../domain/buy-box/types';

export interface ComputeBuyBoxRankingResult {
  winnerId: string;
  winnerScore: number;
  assignmentType: 'MERIT' | 'EXPLORATION';
  alternatives: Array<{
    sellerId: string;
    compositeScore: number;
    rank: number;
  }>;
}

export class ComputeBuyBoxRankingUseCase {
  constructor(
    private readonly rankingEngine: RankingEngine,
    private readonly categoryStrategyService: CategoryStrategyService,
    private readonly explorationAllocator: ExplorationAllocator,
    private readonly repository: BuyBoxRankingRepository,
  ) {}

  async execute(
    productId: string,
    context: BuyBoxContext,
    categoryId: string,
  ): Promise<ComputeBuyBoxRankingResult> {
    // Step 1: Check for active operator override
    const override = await this.repository.getActiveOverride(productId);
    if (override) {
      return {
        winnerId: override.sellerId,
        winnerScore: 100,
        assignmentType: 'MERIT',
        alternatives: [],
      };
    }

    // Step 2: Load category strategy
    const strategy = await this.categoryStrategyService.getStrategyForCategory(categoryId);

    // Step 3: Select Buy Box winner via ranking engine
    let selectionResult;
    try {
      selectionResult = await this.rankingEngine.selectBuyBoxWinner(productId, context, strategy);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === 'NO_ELIGIBLE_SELLERS') {
        await this.repository.clearBuyBox(productId);
        return {
          winnerId: '',
          winnerScore: 0,
          assignmentType: 'MERIT',
          alternatives: [],
        };
      }
      // Unhandled error — retain previous winner, log, re-throw
      console.error('[ComputeBuyBoxRankingUseCase] Unhandled error during ranking:', err);
      throw err;
    }

    // Step 4: Determine exploration slot
    const recentWinners = await this.repository.getRecentBuyBoxWinners(productId, 7);
    const weeklyWindowCounter = Math.floor(Date.now() / (1000 * 60 * 60)) % 168;
    const isExplorationSlot = this.explorationAllocator.shouldAllocateExplorationSlot(
      productId,
      weeklyWindowCounter,
      strategy.explorationBudget,
    );

    let finalWinnerId = selectionResult.winnerId;
    let finalScore = selectionResult.winnerScore;
    let finalAssignmentType: 'MERIT' | 'EXPLORATION' = 'MERIT';
    const alternatives = selectionResult.alternatives;

    // Step 5: If exploration slot, attempt to override winner with exploration candidate
    if (isExplorationSlot) {
      // Build full ranked seller list (winner + alternatives)
      const rankedSellers = [
        {
          sellerId: selectionResult.winnerId,
          compositeScore: selectionResult.winnerScore,
          hasActiveManipulationPenalty: false,
          hasAnomalyFlag: false,
        },
        ...selectionResult.alternatives.map((s) => ({
          sellerId: s.sellerId,
          compositeScore: s.compositeScore,
          hasActiveManipulationPenalty: false,
          hasAnomalyFlag: false,
        })),
      ];

      const explorationCandidate = this.explorationAllocator.selectExplorationCandidate(
        rankedSellers,
        recentWinners,
        selectionResult.winnerScore,
      );

      if (explorationCandidate !== null) {
        // Find the candidate's score from the ranked list
        const candidateEntry = rankedSellers.find((s) => s.sellerId === explorationCandidate);
        finalWinnerId = explorationCandidate;
        finalScore = candidateEntry?.compositeScore ?? selectionResult.winnerScore;
        finalAssignmentType = 'EXPLORATION';
      }
    }

    // Step 6: Get current winner for change detection (reserved for future event emission)
    await this.repository.getCurrentBuyBoxWinner(productId);

    // Step 7: Persist Buy Box winner and alternatives
    await this.repository.saveBuyBoxWinner(
      productId,
      finalWinnerId,
      finalScore,
      finalAssignmentType,
      alternatives,
    );

    // Step 8: Persist score snapshot for the winner
    await this.repository.saveScoreSnapshot({
      productId,
      sellerId: finalWinnerId,
      compositeScore: finalScore,
      signalValues: {
        priceCompetitiveness: 0,
        sellerTrustScore: 0,
        fulfillmentReliability: 0,
        deliverySpeed: 0,
        stockReliability: 0,
        disputeRate: 0,
        cancellationRate: 0,
        returnRate: 0,
        customerRetentionImpact: 0,
      },
      signalWeights: strategy.weights,
      assignmentType: finalAssignmentType,
      strategyName: strategy.name,
      geographicZone: context.buyerZone,
      anomalyFlags: [],
      computedAt: new Date(),
    });

    // Step 10: Return final result
    return {
      winnerId: finalWinnerId,
      winnerScore: finalScore,
      assignmentType: finalAssignmentType,
      alternatives,
    };
  }
}
