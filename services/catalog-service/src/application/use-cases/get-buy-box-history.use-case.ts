/**
 * Get Buy Box History Use Case
 * Returns the score snapshot history for a product in descending computedAt order.
 *
 * Requirements: 11
 */

import { BuyBoxRankingRepository } from '../../domain/buy-box/repositories/buy-box-ranking.repository.interface';
import { ScoreSnapshotInput } from '../../domain/buy-box/types';

export class GetBuyBoxHistoryUseCase {
  constructor(private readonly repository: BuyBoxRankingRepository) {}

  async execute(productId: string): Promise<ScoreSnapshotInput[]> {
    return this.repository.getScoreSnapshots(productId);
  }
}
