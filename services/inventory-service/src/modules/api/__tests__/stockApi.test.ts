import { StockApi } from '../stockApi';
import { StockManager } from '../../stock/stockManager';
import { ReservationEngine } from '../../reservation/reservationEngine';
import { WarehouseManager } from '../../warehouse/warehouseManager';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

describe('StockApi', () => {
  let api: StockApi;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockStockManager: jest.Mocked<StockManager>;
  let mockReservationEngine: jest.Mocked<ReservationEngine>;
  let mockWarehouseManager: jest.Mocked<WarehouseManager>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockPrisma = { inventoryCount: { create: jest.fn(), update: jest.fn() } } as any;
    mockStockManager = { getStockLevel: jest.fn(), updateStock: jest.fn() } as any;
    mockReservationEngine = { reserveStock: jest.fn(), cancelReservations: jest.fn(), getActiveReservations: jest.fn() } as any;
    mockWarehouseManager = { getActiveWarehouses: jest.fn(), getWarehouseById: jest.fn() } as any;
    api = new StockApi(mockPrisma, mockStockManager, mockReservationEngine, mockWarehouseManager);

    mockReq = { params: {}, query: {}, body: {}, user: { id: 'user-1' } };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  describe('getStockLevel', () => {
    it('should return stock levels', async () => {
      mockReq.params = { variantId: 'var-1' };
      mockStockManager.getStockLevel.mockResolvedValue([
        { variantId: 'var-1', warehouseId: 'wh-1', available: 100, reserved: 20, total: 120, status: 'in_stock', lastUpdated: new Date() }
      ]);

      await api.getStockLevel(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        variantId: 'var-1',
        totalAvailable: 100,
        totalReserved: 20
      }));
    });

    it('should return 404 when stock not found', async () => {
      mockReq.params = { variantId: 'var-999' };
      mockStockManager.getStockLevel.mockResolvedValue([]);

      await api.getStockLevel(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Stock not found' }));
    });
  });

  describe('createReservation', () => {
    it('should create reservation successfully', async () => {
      mockReq.body = { orderId: 'order-1', items: [{ id: 'item-1', variantId: 'var-1', quantity: 5 }] };
      mockReservationEngine.reserveStock.mockResolvedValue({
        success: true,
        reservationId: 'res-1',
        reservations: [],
        expiresAt: new Date().toISOString()
      });

      await api.createReservation(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }));
    });

    it('should return 400 for invalid request', async () => {
      mockReq.body = { orderId: 'order-1' };

      await api.createReservation(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 409 when reservation fails', async () => {
      mockReq.body = { orderId: 'order-1', items: [{ id: 'item-1', variantId: 'var-1', quantity: 5 }] };
      mockReservationEngine.reserveStock.mockResolvedValue({
        success: false,
        unavailableItems: [{ itemId: 'item-1', variantId: 'var-1', requestedQuantity: 5, availableQuantity: 0 }],
        error: 'Insufficient stock'
      });

      await api.createReservation(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });
  });

  describe('cancelReservation', () => {
    it('should cancel reservation', async () => {
      mockReq.params = { orderId: 'order-1' };

      await api.cancelReservation(mockReq as Request, mockRes as Response);

      expect(mockReservationEngine.cancelReservations).toHaveBeenCalledWith('order-1');
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
    });
  });

  describe('getWarehouses', () => {
    it('should return all warehouses', async () => {
      mockWarehouseManager.getActiveWarehouses.mockResolvedValue([
        { id: 'wh-1', code: 'WH1', name: 'Warehouse 1', type: 'regional', status: 'active', address: {}, operatingHours: {} } as any
      ]);

      await api.getWarehouses(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ total: 1 }));
    });
  });

  describe('getWarehouse', () => {
    it('should return warehouse details', async () => {
      mockReq.params = { id: 'wh-1' };
      mockWarehouseManager.getWarehouseById.mockResolvedValue({
        id: 'wh-1', code: 'WH1', name: 'Warehouse 1', type: 'regional', status: 'active',
        address: {}, capacity: {}, operatingHours: {}, createdAt: new Date(), updatedAt: new Date()
      } as any);

      await api.getWarehouse(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'wh-1' }));
    });

    it('should return 404 when not found', async () => {
      mockReq.params = { id: 'wh-999' };
      mockWarehouseManager.getWarehouseById.mockResolvedValue(null);

      await api.getWarehouse(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock successfully', async () => {
      mockReq.params = { variantId: 'var-1', warehouseId: 'wh-1' };
      mockReq.body = { quantity: 10, operation: 'add', reason: 'Restock' };

      await api.adjustStock(mockReq as Request, mockRes as Response);

      expect(mockStockManager.updateStock).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    });

    it('should return 400 for invalid operation', async () => {
      mockReq.params = { variantId: 'var-1', warehouseId: 'wh-1' };
      mockReq.body = { quantity: 10, operation: 'invalid', reason: 'Test' };

      await api.adjustStock(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getOrderReservations', () => {
    it('should return order reservations', async () => {
      mockReq.params = { orderId: 'order-1' };
      mockReservationEngine.getActiveReservations.mockResolvedValue([
        { id: 'res-1', orderItemId: 'item-1', productVariantId: 'var-1', warehouseId: 'wh-1', quantityReserved: 5, status: 'active', expiresAt: new Date(), createdAt: new Date() } as any
      ]);

      await api.getOrderReservations(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ totalReserved: 5 }));
    });
  });

  describe('startInventoryCount', () => {
    it('should start inventory count', async () => {
      mockReq.body = { warehouseId: 'wh-1', type: 'full', notes: 'Test' };
      mockPrisma.inventoryCount.create.mockResolvedValue({
        id: 'count-1', warehouseId: 'wh-1', countType: 'full', countedAt: new Date()
      } as any);

      await api.startInventoryCount(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'in_progress' }));
    });

    it('should return 400 when missing required fields', async () => {
      mockReq.body = { type: 'full' };

      await api.startInventoryCount(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
