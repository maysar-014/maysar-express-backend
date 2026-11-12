/**
 * Seller Location Routes
 *
 * Base path: /api/catalog/seller-locations
 *
 * Seller actions (requires auth + seller role):
 *   POST   /                             Create a location (idempotent via Idempotency-Key header)
 *   GET    /                             List authenticated seller's locations
 *   GET    /search                       Search / filter locations (geo, pagination)
 *   GET    /search?export=csv            Export all matching locations to CSV
 *   GET    /:locationId                  Get one location
 *   GET    /:locationId/metrics          Location summary metrics
 *   GET    /:locationId/detail           Location detail panel
 *   GET    /:locationId/report/pdf       Download location detail as PDF
 *   PUT    /:locationId                  Update location (idempotent via Idempotency-Key header)
 *   PATCH  /:locationId/deactivate       Soft-deactivate (seller self-service)
 *   PATCH  /:locationId/activate         Re-activate
 *
 * Admin-only actions (requires admin role):
 *   DELETE /:locationId                  Hard-delete a location (admin only)
 *
 * Geographic hierarchy (reference data from frontend):
 *   GET    /geography/regions
 *   GET    /geography/districts
 *   GET    /geography/wards
 *   GET    /geography/streets
 *   GET    /geography/validate
 *
 * NOTE: Physical stock, transfers, stock-outs, and reconciliation are owned by
 * inventory-service (see /api/inventory/* endpoints). Catalog owns only the
 * business/location metadata and provisions an owned Inventory warehouse per
 * location.
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '@shared/middleware/auth-context.middleware';
import { IdempotencyMiddleware } from '@shared/middleware/idempotency';
import { resolveRedisUrl } from '@shared/redis/ioredis-client';
import { SellerLocationController } from '../controllers/seller-location.controller';
import { GeographyController } from '../controllers/geography.controller';
import { ManageSellerLocationsUseCase } from '../../application/use-cases/manage-seller-locations.use-case';
import { PrismaSellerLocationRepository } from '../../infrastructure/repositories/prisma-seller-location.repository';

export function createSellerLocationRoutes(prisma: any): Router {
  const router = Router();

  const repo = new PrismaSellerLocationRepository(prisma);
  const locationUseCase = new ManageSellerLocationsUseCase(repo);
  const ctrl = new SellerLocationController(locationUseCase);
  const geoCtrl = new GeographyController(repo);

  // ── Idempotency for location mutations (POST /, PUT /:locationId) ────────
  // Retrying a create/update with the same Idempotency-Key returns the cached
  // response instead of creating a duplicate location.
  const idempotencyMiddleware = new IdempotencyMiddleware(resolveRedisUrl(process.env.REDIS_URL ?? 'redis://redis:6379'), {
    keyPrefix: 'catalog:seller-location:',
    headerName: 'idempotency-key',
    ttlSeconds: 24 * 60 * 60, // 24 hours
  });

  // All routes require authentication
  router.use(requireAuth);

  // ── Geographic hierarchy (reference data from frontend) ───────────────────
  router.get('/geography/regions',           (req, res, next) => geoCtrl.listRegions(req, res, next));
  router.get('/geography/districts',         (req, res, next) => geoCtrl.listDistricts(req, res, next));
  router.get('/geography/wards',             (req, res, next) => geoCtrl.listWards(req, res, next));
  router.get('/geography/streets',           (req, res, next) => geoCtrl.listStreets(req, res, next));
  router.get('/geography/validate',          (req, res, next) => geoCtrl.validateGeography(req, res, next));

  // ── Location CRUD (seller) ────────────────────────────────────────────────
  // Idempotency enforced on create/update so retries never duplicate locations
  router.post('/',             idempotencyMiddleware.middleware(), (req, res, next) => ctrl.createLocation(req, res, next));
  router.get('/',              (req, res, next) => ctrl.listLocations(req, res, next));
  router.get('/:locationId',   (req, res, next) => ctrl.getLocation(req, res, next));
  router.put('/:locationId',   idempotencyMiddleware.middleware(), (req, res, next) => ctrl.updateLocation(req, res, next));

  // Seller self-service: soft deactivate / reactivate (does NOT delete data)
  router.patch('/:locationId/deactivate', (req, res, next) => ctrl.deactivateLocation(req, res, next));
  router.patch('/:locationId/activate',   (req, res, next) => ctrl.activateLocation(req, res, next));

  // Admin-only: hard delete (permanently removes location and all inventory records via cascade)
  router.delete(
    '/:locationId',
    requireRole(['admin']),
    (req, res, next) => ctrl.deleteLocation(req, res, next),
  );

  // ── Location summary metrics ──────────────────────────────────────────────
  router.get('/:locationId/metrics', (req, res, next) => ctrl.getLocationMetrics(req, res, next));

  // ── Location detail panel ─────────────────────────────────────────────────
  router.get('/:locationId/detail', (req, res, next) => ctrl.getLocationDetail(req, res, next));

  // ── Location report (PDF) ─────────────────────────────────────────────────
  router.get('/:locationId/report/pdf', (req, res, next) => ctrl.getLocationReportPdf(req, res, next));

  // ── Location search ───────────────────────────────────────────────────────
  // ?export=csv returns a CSV attachment of all matching locations + stock
  router.get('/search', (req, res, next) => ctrl.searchLocations(req, res, next));

  return router;
}
