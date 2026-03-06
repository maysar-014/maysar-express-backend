import { Router } from 'express';
import { SellerStorefrontController } from '../controllers/seller-storefront.controller';

export function createSellerStorefrontRoutes(controller: SellerStorefrontController): Router {
  const router = Router();

  router.get('/:sellerId/storefront', (req, res) => controller.getStorefront(req, res));
  router.post('/:sellerId/share-url', (req, res) => controller.generateShareUrl(req, res));

  return router;
}
