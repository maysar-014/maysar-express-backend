/**
 * Category Strategy Service
 * Manages category-specific Buy Box ranking strategy configuration and validation.
 */

import {
  CategoryStrategy,
  SignalWeights,
  SIGNAL_KEYS,
  DEFAULT_STRATEGY_WEIGHTS,
  CATEGORY_STRATEGY_PRESETS,
} from './types';
import { BuyBoxRankingRepository } from './repositories/buy-box-ranking.repository.interface';

export class CategoryStrategyService {
  constructor(private repository: BuyBoxRankingRepository) {}

  /**
   * Validate that a SignalWeights object contains all 9 required keys
   * and that the weights sum to 1.0 within ±0.001 tolerance.
   */
  validateWeights(weights: SignalWeights): { valid: boolean; error?: string } {
    const missingKeys = SIGNAL_KEYS.filter((key) => !(key in weights));
    if (missingKeys.length > 0) {
      return { valid: false, error: `Missing signal keys: ${missingKeys.join(', ')}` };
    }

    const sum = SIGNAL_KEYS.reduce((acc, key) => acc + weights[key], 0);
    if (Math.abs(sum - 1.0) > 0.001) {
      return {
        valid: false,
        error: `Weights sum to ${sum.toFixed(6)}, expected 1.0 ±0.001`,
      };
    }

    return { valid: true };
  }

  /**
   * Load the strategy for a category, falling back to the default strategy
   * when no custom strategy is configured.
   */
  async getStrategyForCategory(categoryId: string): Promise<CategoryStrategy> {
    const strategy = await this.repository.getCategoryStrategy(categoryId);

    if (strategy === null) {
      return {
        categoryId: 'DEFAULT',
        name: 'DEFAULT',
        weights: { ...DEFAULT_STRATEGY_WEIGHTS },
        explorationBudget: 0.10,
      };
    }

    return strategy;
  }

  /**
   * Create or update a category strategy after validating weights and
   * exploration budget, and writing an operator audit log entry.
   */
  async upsertStrategy(
    categoryId: string,
    weights: SignalWeights,
    explorationBudget: number,
    operatorId: string
  ): Promise<CategoryStrategy> {
    const validationResult = this.validateWeights(weights);
    if (!validationResult.valid) {
      throw new Error(validationResult.error);
    }

    if (explorationBudget < 0 || explorationBudget > 0.20) {
      throw new Error(
        `explorationBudget must be between 0 and 0.20 inclusive, got ${explorationBudget}`
      );
    }

    const existingStrategy = await this.repository.getCategoryStrategy(categoryId);

    const newStrategy: CategoryStrategy = {
      categoryId,
      name: categoryId,
      weights,
      explorationBudget,
    };

    await this.repository.writeOperatorAuditLog({
      operatorId,
      entityType: 'CategoryStrategy',
      entityId: categoryId,
      field: 'weights',
      previousValue: existingStrategy?.weights ?? null,
      newValue: weights,
      changedAt: new Date(),
    });

    return newStrategy;
  }

  /**
   * Seed the built-in category strategy presets for any category that does
   * not yet have a custom strategy configured.
   */
  async seedDefaultStrategies(): Promise<void> {
    for (const [categoryId, preset] of Object.entries(CATEGORY_STRATEGY_PRESETS)) {
      const existing = await this.repository.getCategoryStrategy(categoryId);

      if (existing === null) {
        await this.upsertStrategy(
          categoryId,
          preset.weights,
          preset.explorationBudget,
          'SYSTEM'
        );
        console.log(`[CategoryStrategyService] Seeded default strategy for category: ${categoryId}`);
      }
    }
  }
}
