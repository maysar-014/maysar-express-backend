/**
 * API Controllers Index
 * Central export point for all API controllers
 * Provides clean imports for all controller classes
 */

import { ProductController } from './product.controller';
import { PricingController } from './pricing.controller';
import { SearchController } from './search.controller';
import { BulkOperationsController } from './bulk-operations.controller';

export { ProductController, PricingController, SearchController, BulkOperationsController };

/**
 * Controller Health Check
 * Utility function to verify controller instantiation
 */
export function verifyControllerHealth(): {
  healthy: boolean;
  issues: string[];
  controllers: string[];
} {
  const issues: string[] = [];
  const controllers: string[] = [];

  try {
    controllers.push('ProductController', 'PricingController', 'SearchController', 'BulkOperationsController');

    // Basic instantiation checks
    const search = new SearchController();
    const bulkOps = new BulkOperationsController();

    if (typeof search.searchProducts !== 'function') {
      issues.push('SearchController missing searchProducts method');
    }

    if (typeof bulkOps.bulkCreateProducts !== 'function') {
      issues.push('BulkOperationsController missing bulkCreateProducts method');
    }

  } catch (error) {
    issues.push(`Controller import/instantiation error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    healthy: issues.length === 0,
    issues,
    controllers
  };
}
