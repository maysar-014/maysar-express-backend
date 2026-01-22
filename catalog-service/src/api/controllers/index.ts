/**
 * API Controllers Index
 * Central export point for all API controllers
 * Provides clean imports for all controller classes
 */

export { ProductController } from './product.controller';
export { PricingController } from './pricing.controller';
export { SearchController } from './search.controller';
export { BulkOperationsController } from './bulk-operations.controller';

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
    // Check if controllers can be imported
    const { ProductController } = require('./product.controller');
    const { PricingController } = require('./pricing.controller');
    const { SearchController } = require('./search.controller');
    const { BulkOperationsController } = require('./bulk-operations.controller');

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
