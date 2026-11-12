/**
 * Seller Offer Routes
 * ENH-009: API routes for seller offer management.
 *
 * Constitution §22: Offers API capability group.
 */

import { Router } from 'express';
import { requireRole } from '@shared/middleware/auth-context.middleware';
import { SellerOfferController } from '../controllers/seller-offer.controller';
import { prisma } from '../../../../../src/config/prisma';

export function createSellerOfferRoutes(): Router {
  const router = Router();
  const controller = new SellerOfferController(prisma as any);

  const sellerMiddleware = [
    requireRole(['seller', 'supplier', 'admin']),
  ];

  /**
   * Create seller offer
   * POST /v1/seller/offers
   */
  router.post('/v1/seller/offers', ...sellerMiddleware, async (req, res) => {
    await controller.createOffer(req, res);
  });

  /**
   * Get seller's own offers
   * GET /v1/seller/offers
   */
  router.get('/v1/seller/offers', ...sellerMiddleware, async (req, res) => {
    await controller.getMyOffers(req, res);
  });

  /**
   * Get active offers for a product (public)
   * GET /v1/products/:productId/offers
   */
  router.get('/v1/products/:productId/offers', async (req, res) => {
    await controller.getActiveOffers(req, res);
  });

  /**
   * Update offer status
   * PATCH /v1/seller/offers/:id/status
   */
  router.patch('/v1/seller/offers/:id/status', ...sellerMiddleware, async (req, res) => {
    await controller.updateOfferStatus(req, res);
  });

  /**
   * Update offer price
   * PATCH /v1/seller/offers/:id/price
   */
  router.patch('/v1/seller/offers/:id/price', ...sellerMiddleware, async (req, res) => {
    await controller.updateOfferPrice(req, res);
  });

  /**
   * Update offer stock
   * PATCH /v1/seller/offers/:id/stock
   */
  router.patch('/v1/seller/offers/:id/stock', ...sellerMiddleware, async (req, res) => {
    await controller.updateOfferStock(req, res);
  });

  return router;
}
