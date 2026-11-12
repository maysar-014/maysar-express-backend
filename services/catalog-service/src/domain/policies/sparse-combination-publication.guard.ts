/**
 * Sparse Combination Publication Guard
 * ENH-013: Enforces that only products with explicitly defined valid
 * configuration combinations may be published.
 *
 * Constitution §5.1, §7.1:
 * "Only combinations that actually exist may be published."
 * "The engine must not automatically create every possible combination."
 *
 * This guard is called during product publication to ensure the catalog
 * never surfaces an unpublishable combination to buyers.
 */

import { ConfigurationDefinitionData } from '../entities/configuration-definition.entity';

export interface PublicationGuardResult {
  allowed: boolean;
  reason?: string;
  /** The number of active combinations found (0 means no valid config exists) */
  activeCombinations: number;
}

export class SparseCombinationPublicationGuard {
  /**
   * Evaluates whether a product may be published based on its
   * configuration definition state.
   *
   * Rules:
   * - If the product has no ConfigurationDefinition, publication is allowed
   *   (simple products with no selectable options).
   * - If the product has a ConfigurationDefinition:
   *   - It must be in 'active' status
   *   - It must have at least one active combination
   *
   * @param definition The configuration definition for this product, or null for
   *                   simple products without selectable options.
   */
  static evaluate(definition: ConfigurationDefinitionData | null): PublicationGuardResult {
    // Simple products with no selectable configuration — always allowed
    if (!definition) {
      return {
        allowed: true,
        activeCombinations: 0,
      };
    }

    // Configuration definition must be active
    if (definition.status !== 'active') {
      return {
        allowed: false,
        reason: `Product has a configuration definition with status "${definition.status}". Only products with an active configuration definition may be published.`,
        activeCombinations: 0,
      };
    }

    // Must have at least one active combination — this is the sparse matrix check.
    // An active definition with zero combinations has no valid purchasable configurations.
    const activeCombinations = definition.combinations.filter(c => c.active).length;
    if (activeCombinations === 0) {
      return {
        allowed: false,
        reason: `Product configuration has no active combinations. Define at least one valid configuration combination before publishing.`,
        activeCombinations: 0,
      };
    }

    return {
      allowed: true,
      activeCombinations,
    };
  }

  /**
   * Returns the subset of active combinations from a definition.
   * Convenience helper for callers that need to enumerate valid options.
   */
  static getActiveCombinations(definition: ConfigurationDefinitionData): typeof definition.combinations {
    return definition.combinations.filter(c => c.active);
  }

  /**
   * Returns true if a product with the given definition is ready to publish.
   * Shorthand for evaluate(...).allowed.
   */
  static canPublish(definition: ConfigurationDefinitionData | null): boolean {
    return this.evaluate(definition).allowed;
  }
}
