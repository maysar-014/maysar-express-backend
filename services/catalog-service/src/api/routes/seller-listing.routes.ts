/**
 * Seller Listing Routes
 * ENH-005: MSLE seller listing workflow API (Constitution §12-17, §22).
 *
 * Listing API capability group:
 * - POST   /v1/seller/listing/start         — Start a new listing
 * - PUT    /v1/seller/listing/draft/:id      — Save/update draft (auto-save)
 * - GET    /v1/seller/listing/draft/:id      — Retrieve draft (resume)
 * - GET    /v1/seller/listing/drafts         — List all drafts (recovery)
 * - POST   /v1/seller/listing/:id/validate   — Validate listing
 * - POST   /v1/seller/listing/:id/publish    — Publish listing
 */

import { Router } from 'express';
import { requireRole } from '@shared/middleware/auth-context.middleware';
import { SellerListingController } from '../controllers/seller-listing.controller';
import { prisma } from '../../../../../src/config/prisma';

export function createSellerListingRoutes(): Router {
  const router = Router();
  const controller = new SellerListingController(prisma as any);

  const sellerMiddleware = [
    requireRole(['seller', 'supplier', 'admin']),
  ];

  /**
   * Start listing — creates a new draft in the 'identify' stage
   * POST /v1/seller/listing/start
   * Body: { entryPath: 'PATH_A' | 'PATH_B', productId?: string }
   */
  router.post('/v1/seller/listing/start', ...sellerMiddleware, async (req, res) => {
    await controller.startListing(req, res);
  });

  /**
   * Save listing draft (auto-save or manual save)
   * PUT /v1/seller/listing/draft/:id
   * Body: { productDraft?, configurationDraft?, offerDraft?, currentStage? }
   */
  router.put('/v1/seller/listing/draft/:id', ...sellerMiddleware, async (req, res) => {
    await controller.saveDraft(req, res);
  });

  /**
   * Retrieve a draft (resume listing)
   * GET /v1/seller/listing/draft/:id
   */
  router.get('/v1/seller/listing/draft/:id', ...sellerMiddleware, async (req, res) => {
    await controller.getDraft(req, res);
  });

  /**
   * List seller's drafts (for resume/recovery — Constitution §16)
   * GET /v1/seller/listing/drafts
   */
  router.get('/v1/seller/listing/drafts', ...sellerMiddleware, async (req, res) => {
    await controller.listDrafts(req, res);
  });

  /**
   * Validate listing (does not publish)
   * POST /v1/seller/listing/:id/validate
   */
  router.post('/v1/seller/listing/:id/validate', ...sellerMiddleware, async (req, res) => {
    await controller.validateListing(req, res);
  });

  /**
   * Publish listing
   * POST /v1/seller/listing/:id/publish
   */
  router.post('/v1/seller/listing/:id/publish', ...sellerMiddleware, async (req, res) => {
    await controller.publishListing(req, res);
  });

  return router;
}
