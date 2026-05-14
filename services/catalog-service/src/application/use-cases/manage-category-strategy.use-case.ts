/**
 * Manage Category Strategy Use Case
 * Wraps CategoryStrategyService.upsertStrategy() with operator role authorization.
 *
 * Requirements: 2, 13
 */

import { CategoryStrategyService } from '../../domain/buy-box/category-strategy.service';
import { CategoryStrategy, SignalWeights } from '../../domain/buy-box/types';

export class ManageCategoryStrategyUseCase {
  constructor(private readonly categoryStrategyService: CategoryStrategyService) {}

  async execute(
    categoryId: string,
    weights: SignalWeights,
    explorationBudget: number,
    operatorId: string,
    operatorRole: string,
  ): Promise<CategoryStrategy> {
    if (operatorRole !== 'admin' && operatorRole !== 'operator') {
      throw new Error('INSUFFICIENT_PERMISSIONS');
    }

    return this.categoryStrategyService.upsertStrategy(
      categoryId,
      weights,
      explorationBudget,
      operatorId,
    );
  }
}
