import { Request, Response } from 'express';
import { StockManager } from '../stock/stockManager';
import { ReservationEngine } from '../reservation/reservationEngine';
import { WarehouseManager } from '../warehouse/warehouseManager';
import { PrismaClient } from '@prisma/client';

export class StockApi {
  constructor(
    private prisma: PrismaClient,
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
      const performedBy = req.user?.id || 'system';

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
      const countedBy = req.user?.id;

      if (!warehouseId || !countedBy) {
        res.status(400).json({ error: 'Invalid request: warehouseId and countedBy required' });
        return;
      }

      // Create inventory count record
      const inventoryCount = await this.prisma.inventoryCount.create({
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

      // Update inventory count
      const count = await this.prisma.inventoryCount.update({
        where: { id: countId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          approvedBy,
          itemsCounted: items.length,
          discrepanciesFound: items.filter(item => item.discrepancy !== 0).length
        }
      });

      // Create count items
      for (const item of items) {
        await this.prisma.inventoryCountItem.create({
          data: {
            inventoryCountId: countId,
            productVariantId: item.variantId,
            systemQuantity: item.systemQuantity,
            countedQuantity: item.countedQuantity
          }
        });
      }

      // Calculate total value (simplified)
      const totalValue = items.reduce((sum, item) => sum + (item.countedQuantity * (item.unitCost || 0)), 0);

      await this.prisma.inventoryCount.update({
        where: { id: countId },
        data: { totalValue }
      });

      // Emit completion event
      await this.eventBus.emit('InventoryCountCompleted.v1', {
        inventoryCountId: countId,
        warehouseId: count.warehouseId,
        itemsCounted: items.length,
        discrepanciesFound: count.discrepanciesFound,
        totalValue
      });

      res.json({
        countId,
        status: 'completed',
        itemsCounted: items.length,
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
      const whereClause: any = {};
      if (warehouseId) whereClause.warehouseId = warehouseId;
      if (lowStockOnly === 'true') {
        whereClause.quantityAvailable = { lte: this.prisma.stockItem.fields.reorderPoint };
      }

      const stockItems = await this.prisma.stockItem.findMany({
        where: whereClause,
        include: { warehouse: true },
        orderBy: { quantityAvailable: 'asc' }
      });

      const analytics = stockItems.map(item => ({
        variantId: item.productVariantId,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouse.name,
        available: item.quantityAvailable,
        reserved: item.quantityReserved,
        reorderPoint: item.reorderPoint,
        status: this.calculateStockStatus(item),
        utilizationRate: item.maxStock ? (item.quantityAvailable / item.maxStock) : null
      }));

      res.json({
        analytics,
        total: analytics.length,
        lowStockCount: analytics.filter(a => a.status === 'low_stock').length,
        outOfStockCount: analytics.filter(a => a.status === 'out_of_stock').length,
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
}
