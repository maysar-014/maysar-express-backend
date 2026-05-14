/**
 * Clear Anomaly Flag Use Case
 * Validates operator role and clears an anomaly flag by setting clearedAt and clearedByOperatorId.
 *
 * Requirements: 5
 */

import { BuyBoxRankingRepository } from '../../domain/buy-box/repositories/buy-box-ranking.repository.interface';

export class ClearAnomalyFlagUseCase {
  constructor(private readonly repository: BuyBoxRankingRepository) {}

  async execute(flagId: string, operatorId: string, operatorRole: string): Promise<void> {
    if (operatorRole !== 'admin' && operatorRole !== 'operator') {
      throw new Error('INSUFFICIENT_PERMISSIONS');
    }

    await this.repository.clearAnomalyFlag(flagId, operatorId, new Date());
  }
}
