import { Request, Response } from 'express';
import { StockManager } from '../stock/stockManager';
import { ReservationEngine } from '../reservation/reservationEngine';
import { WarehouseManager } from '../warehouse/warehouseManager';
import { eventBus } from '@shared-events/eventBus';
import { isSystemId } from '@shared/ids/id';

interface InventoryCountRecord {
  id: string;
  warehouseId: string;
  countType: string;
  countedAt: Date;
  discrepanciesFound: number;
  completedAt: Date | null;
}

interface StockItemAnalyticsRecord {
  productVariantId: string;
  warehouseId: string;
  quantityAvailable: number;
  quantityReserved: number;
  reorderPoint: number | null;
  maxStock: number | null;
  warehouse: {
    name: string;
  };
}

interface InventoryCountDelegate {
  create(args: Record<string, unknown>): Promise<InventoryCountRecord>;
  update(args: Record<string, unknown>): Promise<InventoryCountRecord>;
}

interface InventoryCountItemDelegate {
  create(args: Record<string, unknown>): Promise<unknown>;
}

interface StockItemDelegate {
  findMany(args: Record<string, unknown>): Promise<StockItemAnalyticsRecord[]>;
}

const INVALID_QUERY_RESPONSE = { error: 'Invalid query parameters' };

const getSingleQueryValue = (value: unknown): { value?: string | boolean; error?: string } => {
  if (value === undefined) {
    return {};
  }

  if (Array.isArray(value)) {
    return { error: 'Query parameter must not be repeated' };
  }

  if (typeof value === 'boolean') {
    return { value };
  }

  if (typeof value !== 'string') {
    return { error: 'Query parameter must be a string' };
  }

  return { value };
};

interface StockApiPrisma {
  inventory_InventoryCount?: InventoryCountDelegate;
  inventoryCount?: InventoryCountDelegate;
  inventory_InventoryCountItem?: InventoryCountItemDelegate;
  inventoryCountItem?: InventoryCountItemDelegate;
  inventory_StockItem?: StockItemDelegate;
  stockItem?: StockItemDelegate;
}

export class StockApi {
  constructor(
    private prisma: StockApiPrisma,
    private stockManager: StockManager,
    private reservationEngine: ReservationEngine,
    private warehouseManager: WarehouseManager
  ) {}

  /**
   * GET /stock/:variantId
   * Get real-time stock levels for a product variant
   */
  async getStockLevel(req: Request, res: Response): Promise<void> {
    try {
      const { variantId } = req.params;
      const { warehouseId } = req.query;

      const stockLevels = await this.stockManager.getStockLevel(
        variantId,
        warehouseId as string | undefined
      );

      if (stockLevels.length === 0) {
        res.status(404).json({
          error: 'Stock not found',
          variantId,
          warehouseId: warehouseId || 'all'
        });
        return;
      }

      res.json({
        variantId,
        warehouseId: warehouseId || 'all',
        stockLevels,
        totalAvailable: stockLevels.reduce((sum, level) => sum + level.available, 0),
        totalReserved: stockLevels.reduce((sum, level) => sum + level.reserved, 0),
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting stock level:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /materials
   * Supplier-facing stock listing with reorder metadata.
   */
  async listMaterials(req: Request, res: Response): Promise<void> {
    try {
      const allowedQueryKeys = new Set(['warehouseId', 'lowStockOnly']);
      const unknownQueryKeys = Object.keys(req.query || {}).filter((key) => !allowedQueryKeys.has(key));
      if (unknownQueryKeys.length > 0) {
        res.status(400).json(INVALID_QUERY_RESPONSE);
        return;
      }

      const warehouseIdQuery = getSingleQueryValue(req.query?.warehouseId);
      const lowStockOnlyQuery = getSingleQueryValue(req.query?.lowStockOnly);
      if (warehouseIdQuery.error || lowStockOnlyQuery.error) {
        res.status(400).json(INVALID_QUERY_RESPONSE);
        return;
      }

      const warehouseId = typeof warehouseIdQuery.value === 'string' ? warehouseIdQuery.value.trim() : undefined;
      const lowStockOnly = lowStockOnlyQuery.value;

      if (warehouseIdQuery.value !== undefined && !warehouseId) {
        res.status(400).json(INVALID_QUERY_RESPONSE);
        return;
      }

      if (warehouseId && !isSystemId(warehouseId)) {
        res.status(400).json(INVALID_QUERY_RESPONSE);
        return;
      }

      const normalizedLowStockOnly =
        typeof lowStockOnly === 'string'
          ? lowStockOnly.trim().toLowerCase()
          : lowStockOnly;

      if (normalizedLowStockOnly !== undefined && normalizedLowStockOnly !== true && normalizedLowStockOnly !== false && normalizedLowStockOnly !== 'true' && normalizedLowStockOnly !== 'false') {
        res.status(400).json(INVALID_QUERY_RESPONSE);
        return;
      }

      const whereClause: Record<string, unknown> = {};
      if (warehouseId) whereClause.warehouseId = warehouseId;

      const stockItems = await this.stockItemDelegate.findMany({
        where: whereClause,
        include: { warehouse: true },
        orderBy: { updatedAt: 'desc' }
      });

      const materials = stockItems.map((item) => ({
        variantId: item.productVariantId,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouse.name,
        available: item.quantityAvailable,
        reserved: item.quantityReserved,
        reorderPoint: item.reorderPoint,
        maxStock: item.maxStock,
        status: this.calculateStockStatus(item),
        utilizationRate: item.maxStock ? (item.quantityAvailable / item.maxStock) : null
      }));

      const lowStockOnlyEnabled = normalizedLowStockOnly === true || normalizedLowStockOnly === 'true';
      const filteredMaterials = lowStockOnlyEnabled
        ? materials.filter((item) => item.status !== 'in_stock')
        : materials;

      res.json({
        materials: filteredMaterials,
        total: filteredMaterials.length,
        lowStockCount: filteredMaterials.filter((item) => item.status === 'low_stock').length,
        outOfStockCount: filteredMaterials.filter((item) => item.status === 'out_of_stock').length,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error listing materials:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /materials/:variantId
   * Supplier-facing material stock detail by variant.
   */
  async getMaterialStock(req: Request, res: Response): Promise<void> {
    try {
      const { variantId } = req.params;
      if (!isSystemId(variantId)) {
        res.status(400).json({ error: 'Invalid variantId' });
        return;
      }

      const allowedQueryKeys = new Set(['warehouseId']);
      const unknownQueryKeys = Object.keys(req.query || {}).filter((key) => !allowedQueryKeys.has(key));
      if (unknownQueryKeys.length > 0) {
        res.status(400).json(INVALID_QUERY_RESPONSE);
        return;
      }

      const warehouseIdQuery = getSingleQueryValue(req.query?.warehouseId);
      if (warehouseIdQuery.error) {
        res.status(400).json(INVALID_QUERY_RESPONSE);
        return;
      }

      const warehouseId = typeof warehouseIdQuery.value === 'string' ? warehouseIdQuery.value.trim() : undefined;
      if (warehouseIdQuery.value !== undefined && !warehouseId) {
        res.status(400).json(INVALID_QUERY_RESPONSE);
        return;
      }

      if (warehouseId && !isSystemId(warehouseId)) {
        res.status(400).json(INVALID_QUERY_RESPONSE);
        return;
      }

      const whereClause = warehouseId
        ? { productVariantId: variantId, warehouseId }
        : { productVariantId: variantId };

      const stockItems = await this.stockItemDelegate.findMany({
        where: whereClause,
        include: { warehouse: true },
        orderBy: { updatedAt: 'desc' }
      });

      if (stockItems.length === 0) {
        res.status(404).json({
          error: 'Material not found',
          variantId,
          warehouseId: warehouseId || 'all'
        });
        return;
      }

      const materials = stockItems.map((item) => ({
        variantId: item.productVariantId,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouse.name,
        available: item.quantityAvailable,
        reserved: item.quantityReserved,
        reorderPoint: item.reorderPoint,
        maxStock: item.maxStock,
        status: this.calculateStockStatus(item)
      }));

      res.json({
        variantId,
        warehouseId: warehouseId || 'all',
        materials,
        totalAvailable: materials.reduce((sum, item) => sum + item.available, 0),
        totalReserved: materials.reduce((sum, item) => sum + item.reserved, 0),
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting material stock:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /reservations
   * Create stock reservations for an order
   */
  async createReservation(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, items, shippingAddress } = req.body;

      // Validate request
      if (!orderId || !items || !Array.isArray(items)) {
        res.status(400).json({ error: 'Invalid request: orderId and items required' });
        return;
      }

      const result = await this.reservationEngine.reserveStock({
        orderId,
        items,
        shippingAddress
      });

      if (result.success) {
        res.status(201).json({
          reservationId: result.reservationId,
          status: 'confirmed',
          reservations: result.reservations,
          expiresAt: result.expiresAt
        });
      } else {
        res.status(409).json({
          error: 'Stock reservation failed',
          unavailableItems: result.unavailableItems,
          message: result.error
        });
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * DELETE /reservations/:orderId
   * Cancel reservations for an order
   */
  async cancelReservation(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      await this.reservationEngine.cancelReservations(orderId);

      res.json({
        orderId,
        status: 'cancelled',
        message: 'Reservations cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /warehouses
   * Get all active warehouses
   */
  async getWarehouses(req: Request, res: Response): Promise<void> {
    try {
      const warehouses = await this.warehouseManager.getActiveWarehouses();

      res.json({
        warehouses: warehouses.map(w => ({
          id: w.id,
          code: w.code,
          name: w.name,
          type: w.type,
          status: w.status,
          address: w.address,
          operatingHours: w.operatingHours
        })),
        total: warehouses.length
      });
    } catch (error) {
      console.error('Error getting warehouses:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /warehouses/:id
   * Get warehouse details
   */
  async getWarehouse(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const warehouse = await this.warehouseManager.getWarehouseById(id);

      if (!warehouse) {
        res.status(404).json({ error: 'Warehouse not found' });
        return;
      }

      res.json({
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
        type: warehouse.type,
        status: warehouse.status,
        address: warehouse.address,
        capacity: warehouse.capacity,
        operatingHours: warehouse.operatingHours,
        createdAt: warehouse.createdAt,
        updatedAt: warehouse.updatedAt
      });
    } catch (error) {
      console.error('Error getting warehouse:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PUT /stock/:variantId/:warehouseId
   * Manual stock adjustment
   */
  async adjustStock(req: Request, res: Response): Promise<void> {
    try {
      const { variantId, warehouseId } = req.params;
      const { quantity, operation, reason } = req.body;
      const performedBy = req.user?.userId || 'system';

      // Validate request
      if (!quantity || !operation || !reason) {
        res.status(400).json({ error: 'Invalid request: quantity, operation, and reason required' });
        return;
      }

      if (!['add', 'subtract', 'set'].includes(operation)) {
        res.status(400).json({ error: 'Invalid operation: must be add, subtract, or set' });
        return;
      }

      await this.stockManager.updateStock([{
        variantId,
        warehouseId,
        quantity: Number(quantity),
        operation,
        reason,
        referenceType: 'manual_adjustment',
        performedBy
      }]);

      res.json({
        variantId,
        warehouseId,
        operation,
        quantity: Number(quantity),
        reason,
        performedBy,
        status: 'completed'
      });
    } catch (error) {
      console.error('Error adjusting stock:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PUT /materials/:variantId/warehouses/:warehouseId
   * Update material quantity and reorder settings together.
   */
  async updateMaterialInventory(req: Request, res: Response): Promise<void> {
    try {
      const { variantId, warehouseId } = req.params;
      const { quantity, operation, reason, reorderPoint, maxStock } = req.body;
      const performedBy = req.user?.userId || 'system';
      const allowedBodyKeys = new Set(['quantity', 'operation', 'reason', 'reorderPoint', 'maxStock']);

      if (!isSystemId(variantId) || !isSystemId(warehouseId)) {
        res.status(400).json({ error: 'Invalid path parameters' });
        return;
      }

      const unknownBodyKeys = Object.keys(req.body || {}).filter((key) => !allowedBodyKeys.has(key));
      if (unknownBodyKeys.length > 0) {
        res.status(400).json({ error: 'Invalid request body' });
        return;
      }

      const hasQuantityUpdate = quantity !== undefined || operation !== undefined || reason !== undefined;
      const hasConfigurationUpdate = reorderPoint !== undefined || maxStock !== undefined;
      let appliedOperation: 'add' | 'subtract' | 'set' | null = null;
      let appliedQuantity: number | null = null;

      if (!hasQuantityUpdate && !hasConfigurationUpdate) {
        res.status(400).json({
          error: 'Invalid request: provide quantity/operation/reason and/or reorderPoint/maxStock'
        });
        return;
      }

      if (hasConfigurationUpdate) {
        if (reorderPoint !== undefined && (!Number.isInteger(Number(reorderPoint)) || Number(reorderPoint) < 0)) {
          res.status(400).json({ error: 'Invalid reorderPoint: must be a non-negative integer' });
          return;
        }

        if (maxStock !== undefined && maxStock !== null && (!Number.isInteger(Number(maxStock)) || Number(maxStock) <= 0)) {
          res.status(400).json({ error: 'Invalid maxStock: must be a positive integer or null' });
          return;
        }

        await this.stockManager.updateStockConfiguration({
          variantId,
          warehouseId,
          reorderPoint: reorderPoint === undefined ? undefined : Number(reorderPoint),
          maxStock: maxStock === undefined ? undefined : (maxStock === null ? null : Number(maxStock)),
          performedBy,
          reason: typeof reason === 'string' && reason.trim() ? reason : 'Material inventory configuration updated'
        });
      }

      if (hasQuantityUpdate) {
        if (
          quantity === undefined
          || quantity === null
          || (typeof quantity === 'string' && quantity.trim().length === 0)
          || typeof operation !== 'string'
          || typeof reason !== 'string'
          || reason.trim().length === 0
        ) {
          res.status(400).json({
            error: 'Invalid request: quantity, operation, and reason are required for quantity updates'
          });
          return;
        }

        const normalizedQuantity = typeof quantity === 'string' ? Number(quantity.trim()) : quantity;

        if (!Number.isFinite(normalizedQuantity) || normalizedQuantity < 0) {
          res.status(400).json({ error: 'Invalid quantity: must be a non-negative number' });
          return;
        }

        if (!['add', 'subtract', 'set'].includes(operation)) {
          res.status(400).json({ error: 'Invalid operation: must be add, subtract, or set' });
          return;
        }

        const normalizedOperation = operation as 'add' | 'subtract' | 'set';
        appliedOperation = normalizedOperation;
        appliedQuantity = normalizedQuantity;

        await this.stockManager.updateStock([{
          variantId,
          warehouseId,
          quantity: normalizedQuantity,
          operation: normalizedOperation,
          reason,
          referenceType: 'manual_adjustment',
          performedBy
        }]);
      }

      const stockItems = await this.stockItemDelegate.findMany({
        where: {
          productVariantId: variantId,
          warehouseId
        },
        include: { warehouse: true },
        orderBy: { updatedAt: 'desc' }
      });

      const currentItem = stockItems[0];
      if (!currentItem) {
        res.status(404).json({ error: 'Material not found' });
        return;
      }

      res.json({
        variantId,
        warehouseId,
        available: currentItem.quantityAvailable,
        reserved: currentItem.quantityReserved,
        reorderPoint: currentItem.reorderPoint,
        maxStock: currentItem.maxStock,
        status: this.calculateStockStatus(currentItem),
        performedBy,
        operation: appliedOperation,
        quantity: appliedQuantity,
        reason: reason || 'Material inventory updated',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating material inventory:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      const normalized = message.toLowerCase();
      const statusCode = normalized.includes('not found')
        ? 404
        : (normalized.includes('must') || normalized.includes('invalid') || normalized.includes('cannot') || normalized.includes('exceed'))
          ? 400
          : 500;
      res.status(statusCode).json({ error: message });
    }
  }

  /**
   * GET /reservations/:orderId
   * Get active reservations for an order
   */
  async getOrderReservations(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      const reservations = await this.reservationEngine.getActiveReservations(orderId);

      res.json({
        orderId,
        reservations: reservations.map(r => ({
          id: r.id,
          orderItemId: r.orderItemId,
          productVariantId: r.productVariantId,
          warehouseId: r.warehouseId,
          quantityReserved: r.quantityReserved,
          status: r.status,
          expiresAt: r.expiresAt,
          createdAt: r.createdAt
        })),
        totalReserved: reservations.reduce((sum, r) => sum + r.quantityReserved, 0)
      });
    } catch (error) {
      console.error('Error getting reservations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /inventory-counts
   * Start inventory count process
   */
  async startInventoryCount(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId, type, notes } = req.body;
      const countedBy = req.user?.userId;

      if (!warehouseId || !countedBy) {
        res.status(400).json({ error: 'Invalid request: warehouseId and countedBy required' });
        return;
      }

      // Create inventory count record
      const inventoryCount = await this.inventoryCountDelegate.create({
        data: {
          warehouseId,
          countedBy,
          countType: type || 'full',
          notes
        }
      });

      res.status(201).json({
        countId: inventoryCount.id,
        warehouseId,
        status: 'in_progress',
        countType: inventoryCount.countType,
        startedAt: inventoryCount.countedAt
      });
    } catch (error) {
      console.error('Error starting inventory count:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PUT /inventory-counts/:countId
   * Complete inventory count
   */
  async completeInventoryCount(req: Request, res: Response): Promise<void> {
    try {
      const { countId } = req.params;
      const { items, approvedBy } = req.body;

      if (!items || !Array.isArray(items)) {
        res.status(400).json({ error: 'Invalid request: items array required' });
        return;
      }
      const typedItems = items as Array<{
        variantId: string;
        systemQuantity: number;
        countedQuantity: number;
        discrepancy?: number;
        unitCost?: number;
      }>;

      // Update inventory count
      const count = await this.inventoryCountDelegate.update({
        where: { id: countId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          approvedBy,
          itemsCounted: typedItems.length,
          discrepanciesFound: typedItems.filter((item) => item.discrepancy !== 0).length
        }
      });

      // Create count items
      for (const item of typedItems) {
        await this.inventoryCountItemDelegate.create({
          data: {
            inventoryCountId: countId,
            productVariantId: item.variantId,
            systemQuantity: item.systemQuantity,
            countedQuantity: item.countedQuantity
          }
        });
      }

      // Calculate total value (simplified)
      const totalValue = typedItems.reduce((sum, item) => sum + (item.countedQuantity * (item.unitCost || 0)), 0);

      await this.inventoryCountDelegate.update({
        where: { id: countId },
        data: { totalValue }
      });

      // Emit completion event
      await eventBus.emit('InventoryCountCompleted.v1', {
        inventoryCountId: countId,
        warehouseId: count.warehouseId,
        itemsCounted: typedItems.length,
        discrepanciesFound: count.discrepanciesFound,
        totalValue
      });

      res.json({
        countId,
        status: 'completed',
        itemsCounted: typedItems.length,
        discrepanciesFound: count.discrepanciesFound,
        totalValue,
        completedAt: count.completedAt
      });
    } catch (error) {
      console.error('Error completing inventory count:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /analytics/stock-levels
   * Get stock level analytics
   */
  async getStockAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId, lowStockOnly } = req.query;

      // Get stock items with warehouse info
      const whereClause: Record<string, unknown> = {};
      if (warehouseId) whereClause.warehouseId = warehouseId;

      const stockItems = await this.stockItemDelegate.findMany({
        where: whereClause,
        include: { warehouse: true },
        orderBy: { quantityAvailable: 'asc' }
      });

      const analytics = stockItems.map((item) => ({
        variantId: item.productVariantId,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouse.name,
        available: item.quantityAvailable,
        reserved: item.quantityReserved,
        reorderPoint: item.reorderPoint,
        status: this.calculateStockStatus(item),
        utilizationRate: item.maxStock ? (item.quantityAvailable / item.maxStock) : null
      }));
      const filteredAnalytics = lowStockOnly === 'true'
        ? analytics.filter((analytic) => analytic.status !== 'in_stock')
        : analytics;

      res.json({
        analytics: filteredAnalytics,
        total: filteredAnalytics.length,
        lowStockCount: filteredAnalytics.filter((analytic) => analytic.status === 'low_stock').length,
        outOfStockCount: filteredAnalytics.filter((analytic) => analytic.status === 'out_of_stock').length,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting stock analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Calculate stock status for API responses
   */
  private calculateStockStatus(stockItem: any): 'in_stock' | 'low_stock' | 'out_of_stock' {
    const available = stockItem.quantityAvailable;
    const reorderPoint = stockItem.reorderPoint || 0;

    if (available <= 0) return 'out_of_stock';
    if (available <= reorderPoint) return 'low_stock';
    return 'in_stock';
  }

  private get inventoryCountDelegate(): InventoryCountDelegate {
    const delegate = this.prisma.inventory_InventoryCount ?? this.prisma.inventoryCount;
    if (!delegate) {
      throw new Error('Inventory count delegate is not configured on prisma client');
    }
    return delegate;
  }

  private get inventoryCountItemDelegate(): InventoryCountItemDelegate {
    const delegate = this.prisma.inventory_InventoryCountItem ?? this.prisma.inventoryCountItem;
    if (!delegate) {
      throw new Error('Inventory count item delegate is not configured on prisma client');
    }
    return delegate;
  }

  private get stockItemDelegate(): StockItemDelegate {
    const delegate = this.prisma.inventory_StockItem ?? this.prisma.stockItem;
    if (!delegate) {
      throw new Error('Stock item delegate is not configured on prisma client');
    }
    return delegate;
  }
}
