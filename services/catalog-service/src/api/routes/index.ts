/**
 * Main Application Entry Point for Catalog Service
 * Mounts all routes including matching routes
 */

import express from 'express';
import { Router } from 'express';
import { createProductRoutes } from './product.routes';
import { MatchingRoutes } from './matching.routes';
import { createSellerStorefrontRoutes } from './seller-storefront.routes';
import { SellerStorefrontController } from '../controllers/seller-storefront.controller';

export function createCatalogRoutes(dependencies: {
  productController: any;
  productMatchingController: any;
}): Router {
  const router = Router();

  // Mount product routes
  const productRoutes = createProductRoutes(dependencies.productController);
  router.use(productRoutes);

  // Mount matching routes
  const matchingRoutes = MatchingRoutes.create(dependencies.productMatchingController);
  router.use(matchingRoutes);

  // Mount seller storefront routes
  const storefrontController = new SellerStorefrontController();
  const storefrontRoutes = createSellerStorefrontRoutes(storefrontController);
  router.use('/sellers', storefrontRoutes);

  return router;
}

// Export for use in main app
export { createProductRoutes } from './product.routes';
export { MatchingRoutes } from './matching.routes';
export { createSellerStorefrontRoutes } from './seller-storefront.routes';
