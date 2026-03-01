import { ReservationEngine, ReservationRequest } from '../reservationEngine';
import { StockManager } from '../../stock/stockManager';
import { WarehouseManager } from '../../warehouse/warehouseManager';
import { EventBus } from '../../../../../shared/events/eventBus';
import { PrismaClient } from '@prisma/client';

jest.mock('../../stock/stockManager');
jest.mock('../../warehouse/warehouseManager');
jest.mock('../../../../../shared/events/eventBus');

describe('ReservationEngine', () => {
  let engine: ReservationEngine;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockStockManager: jest.Mocked<StockManager>;
  let mockWarehouseManager: jest.Mocked<WarehouseManager>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    mockPrisma = {
      warehouse: { findMany: jest.fn() },
      reservation: { findMany: jest.fn(), updateMany: jest.fn() }
    } as any;
    mockStockManager = { getStockLevel: jest.fn(), reserveStock: jest.fn(), releaseStock: jest.fn(), reduceStock: jest.fn() } as any;
    mockWarehouseManager = {} as any;
    mockEventBus = { emit: jest.fn() } as any;
    engine = new ReservationEngine(mockPrisma, mockStockManager, mockWarehouseManager, mockEventBus);
  });

  describe('reserveStock', () => {
    it('should reserve stock successfully', async () => {
      const request: ReservationRequest = {
        orderId: 'order-1',
        items: [{ id: 'item-1', variantId: 'var-1', quantity: 5, price: 100 }]
      };

      mockPrisma.warehouse.findMany.mockResolvedValue([{
        id: 'wh-1', status: 'active', stockItems: [{ productVariantId: 'var-1', quantityAvailable: 10 }],
        address: { coordinates: { lat: 0, lng: 0 } }, type: 'regional', operatingHours: null
      }] as any);
      mockStockManager.getStockLevel.mockResolvedValue([{ available: 10 }] as any);
      mockStockManager.reserveStock.mockResolvedValue();

      const result = await engine.reserveStock(request);

      expect(result.success).toBe(true);
      expect(result.reservations).toHaveLength(1);
      expect(mockEventBus.emit).toHaveBeenCalledWith('StockReserved.v1', expect.any(Object));
    });

    it('should fail when insufficient stock', async () => {
      const request: ReservationRequest = {
        orderId: 'order-1',
        items: [{ id: 'item-1', variantId: 'var-1', quantity: 50, price: 100 }]
      };

      mockPrisma.warehouse.findMany.mockResolvedValue([{
        id: 'wh-1', status: 'active', stockItems: [{ productVariantId: 'var-1', quantityAvailable: 10 }],
        address: { coordinates: { lat: 0, lng: 0 } }, type: 'regional', operatingHours: null
      }] as any);
      mockStockManager.getStockLevel.mockResolvedValue([{ available: 10 }] as any);

      const result = await engine.reserveStock(request);

      expect(result.success).toBe(false);
      expect(result.unavailableItems).toHaveLength(1);
    });

    it('should rollback on partial failure', async () => {
      const request: ReservationRequest = {
        orderId: 'order-1',
        items: [
          { id: 'item-1', variantId: 'var-1', quantity: 5, price: 100 },
          { id: 'item-2', variantId: 'var-2', quantity: 50, price: 200 }
        ]
      };

      mockPrisma.warehouse.findMany
        .mockResolvedValueOnce([{ id: 'wh-1', status: 'active', stockItems: [{ productVariantId: 'var-1', quantityAvailable: 10 }], address: { coordinates: { lat: 0, lng: 0 } }, type: 'regional', operatingHours: null }] as any)
        .mockResolvedValueOnce([{ id: 'wh-1', status: 'active', stockItems: [{ productVariantId: 'var-2', quantityAvailable: 10 }], address: { coordinates: { lat: 0, lng: 0 } }, type: 'regional', operatingHours: null }] as any);
      mockStockManager.getStockLevel
        .mockResolvedValueOnce([{ available: 10 }] as any)
        .mockResolvedValueOnce([{ available: 10 }] as any);
      mockStockManager.reserveStock.mockResolvedValue();

      const result = await engine.reserveStock(request);

      expect(result.success).toBe(false);
      expect(mockStockManager.releaseStock).toHaveBeenCalled();
    });
  });

  describe('cancelReservations', () => {
    it('should cancel reservations', async () => {
      await engine.cancelReservations('order-1');
      expect(mockStockManager.releaseStock).toHaveBeenCalledWith('order-1', 'cancelled');
      expect(mockEventBus.emit).toHaveBeenCalledWith('StockReleased.v1', expect.any(Object));
    });
  });

  describe('getActiveReservations', () => {
    it('should return active reservations', async () => {
      mockPrisma.reservation.findMany.mockResolvedValue([{ id: 'res-1', orderId: 'order-1' }] as any);
      const result = await engine.getActiveReservations('order-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('fulfillReservations', () => {
    it('should fulfill reservations', async () => {
      mockPrisma.reservation.findMany.mockResolvedValue([{
        id: 'res-1', orderId: 'order-1', productVariantId: 'var-1',
        warehouseId: 'wh-1', quantityReserved: 5, status: 'active'
      }] as any);
      mockPrisma.reservation.updateMany.mockResolvedValue({ count: 1 } as any);

      await engine.fulfillReservations('order-1');

      expect(mockPrisma.reservation.updateMany).toHaveBeenCalled();
      expect(mockStockManager.reduceStock).toHaveBeenCalled();
    });
  });
});
