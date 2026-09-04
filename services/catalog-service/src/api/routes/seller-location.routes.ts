/**
 * Seller Location Routes
 *
 * Base path: /api/catalog/seller-locations
 *
 * Seller actions (requires auth + seller role):
 *   POST   /                             Create a location
 *   GET    /                             List authenticated seller's locations
 *   GET    /:locationId                  Get one location
 *   PUT    /:locationId                  Update location (name, hours, address, isPrimary)
 *   PATCH  /:locationId/deactivate       Soft-deactivate (seller self-service)
 *   PATCH  /:locationId/activate         Re-activate
 *
 * Admin-only actions (requires admin role):
 *   DELETE /:locationId                  Hard-delete a location (admin only)
 *
 * Product inventory at a location:
 *   PUT    /:locationId/products/:productId       Attach product / set stock
 *   PATCH  /:locationId/products/:productId/stock Adjust stock (delta)
 *   DELETE /:locationId/products/:productId       Detach product
 *
 * Stock transfers:
 *   POST   /transfers                    Transfer stock between locations
 *
 * Product view:
 *   GET    /products/:productId          All locations for a product (seller-scoped)
 *
 * Internal (service-to-service):
 *   POST   /internal/select-fulfillment  Select optimal location for checkout
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '@shared/middleware/auth-context.middleware';
import { SellerLocationController } from '../controllers/seller-location.controller';
import { ManageSellerLocationsUseCase } from '../../application/use-cases/manage-seller-locations.use-case';
import { ManageProductInventoryUseCase } from '../../application/use-cases/manage-product-inventory.use-case';
import { SelectFulfillmentLocationUseCase } from '../../application/use-cases/select-fulfillment-location.use-case';
import { PrismaSellerLocationRepository } from '../../infrastructure/repositories/prisma-seller-location.repository';
import { ValidationError, ForbiddenError } from '../../../../../shared/errors/api-errors';

export function createSellerLocationRoutes(prisma: any): Router {
  const router = Router();

  const repo = new PrismaSellerLocationRepository(prisma);
  const locationUseCase = new ManageSellerLocationsUseCase(repo);
  const inventoryUseCase = new ManageProductInventoryUseCase(repo);
  const fulfillmentUseCase = new SelectFulfillmentLocationUseCase(repo);
  const ctrl = new SellerLocationController(locationUseCase, inventoryUseCase);

  // All routes require authentication
  router.use(requireAuth);

  // ── Location CRUD (seller) ────────────────────────────────────────────────
  router.post('/',             (req, res, next) => ctrl.createLocation(req, res, next));
  router.get('/',              (req, res, next) => ctrl.listLocations(req, res, next));
  router.get('/:locationId',   (req, res, next) => ctrl.getLocation(req, res, next));
  router.put('/:locationId',   (req, res, next) => ctrl.updateLocation(req, res, next));

  // Seller self-service: soft deactivate / reactivate (does NOT delete data)
  router.patch('/:locationId/deactivate', (req, res, next) => ctrl.deactivateLocation(req, res, next));
  router.patch('/:locationId/activate',   (req, res, next) => ctrl.activateLocation(req, res, next));

  // Admin-only: hard delete (permanently removes location and all inventory records via cascade)
  router.delete(
    '/:locationId',
    requireRole(['admin']),
    (req, res, next) => ctrl.deleteLocation(req, res, next),
  );

  // ── Product inventory ─────────────────────────────────────────────────────
  router.put(   '/:locationId/products/:productId',       (req, res, next) => ctrl.attachProduct(req, res, next));
  router.patch( '/:locationId/products/:productId/stock', (req, res, next) => ctrl.adjustStock(req, res, next));
  router.delete('/:locationId/products/:productId',       (req, res, next) => ctrl.detachProduct(req, res, next));

  // ── Stock transfers ───────────────────────────────────────────────────────
  router.post('/transfers', (req, res, next) => ctrl.transferStock(req, res, next));

  // ── Product view ──────────────────────────────────────────────────────────
  router.get('/products/:productId', (req, res, next) => ctrl.getProductLocations(req, res, next));

  // ── Internal fulfillment selection (service-to-service) ──────────────────
  router.post('/internal/select-fulfillment', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { checkoutId, buyerLat, buyerLng, products } = req.body;
      if (!checkoutId) throw new ValidationError('checkoutId is required');
      if (buyerLat === undefined || buyerLng === undefined) throw new ValidationError('buyerLat and buyerLng are required');
      if (!Array.isArray(products) || products.length === 0) throw new ValidationError('products must be a non-empty array');

      const result = await fulfillmentUseCase.execute({
        checkoutId,
        buyerLat: Number(buyerLat),
        buyerLng: Number(buyerLng),
        products,
      });
      res.json({
        success: true,
        data: {
          byProduct: Object.fromEntries(result.byProduct),
          bySellerOrder: Object.fromEntries(result.bySellerOrder),
        },
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
