/**
 * Inventory Service — Business Routes
 *
 * Exposes stock, materials, reservations, warehouse, inventory count,
 * and analytics endpoints. All routes are authenticated (requireAuth is
 * applied by the caller before mounting this router).
 *
 * Mount path: /api/inventory  (applied in services/inventory-service/index.ts)
 */

import { Router } from 'express';
import { StockApi } from '../../modules/api/stockApi';
import { StockOutApi } from '../../modules/api/stockOutApi';

export function createInventoryRoutes(
  stockApi: StockApi,
  stockOutApi: StockOutApi,
): Router {
  const router = Router();

  // ── Stock ─────────────────────────────────────────────────────────────────

  router.get('/stock/:variantId', (req, res) => stockApi.getStockLevel(req, res));
  router.put('/stock/:variantId/:warehouseId', (req, res) => stockApi.adjustStock(req, res));

  // ── Stock-outs ────────────────────────────────────────────────────────────

  router.get('/stock-outs', (req, res) => stockOutApi.list(req, res));
  router.post('/stock-outs', (req, res) => stockOutApi.create(req, res));
  router.post('/stock-outs/reconcile', (req, res) => stockOutApi.reconcile(req, res));

  // ── Materials ─────────────────────────────────────────────────────────────

  router.get('/materials', (req, res) => stockApi.listMaterials(req, res));
  router.get('/materials/:variantId', (req, res) => stockApi.getMaterialStock(req, res));
  router.put('/materials/:variantId/warehouses/:warehouseId', (req, res) => stockApi.updateMaterialInventory(req, res));

  // ── Reservations ──────────────────────────────────────────────────────────

  router.post('/reservations', (req, res) => stockApi.createReservation(req, res));
  router.delete('/reservations/:orderId', (req, res) => stockApi.cancelReservation(req, res));
  router.get('/reservations/:orderId', (req, res) => stockApi.getOrderReservations(req, res));

  // ── Warehouses ────────────────────────────────────────────────────────────

  router.get('/warehouses', (req, res) => stockApi.getWarehouses(req, res));
  router.get('/warehouses/:id', (req, res) => stockApi.getWarehouse(req, res));

  // ── Inventory counts ──────────────────────────────────────────────────────

  router.post('/inventory-counts', (req, res) => stockApi.startInventoryCount(req, res));
  router.put('/inventory-counts/:countId', (req, res) => stockApi.completeInventoryCount(req, res));

  // ── Analytics ─────────────────────────────────────────────────────────────

  router.get('/analytics/stock-levels', (req, res) => stockApi.getStockAnalytics(req, res));

  return router;
}
