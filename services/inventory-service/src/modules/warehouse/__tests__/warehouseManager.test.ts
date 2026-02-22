import { WarehouseManager } from '../warehouseManager';
import { PrismaClient } from '@prisma/client';

describe('WarehouseManager', () => {
  let manager: WarehouseManager;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      warehouse: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
      }
    } as any;
    manager = new WarehouseManager(mockPrisma);
  });

  describe('getActiveWarehouses', () => {
    it('should return active warehouses', async () => {
      const mockWarehouses = [
        { id: 'wh-1', name: 'Warehouse 1', status: 'active' },
        { id: 'wh-2', name: 'Warehouse 2', status: 'active' }
      ];
      mockPrisma.warehouse.findMany.mockResolvedValue(mockWarehouses as any);

      const result = await manager.getActiveWarehouses();

      expect(result).toHaveLength(2);
      expect(mockPrisma.warehouse.findMany).toHaveBeenCalledWith({
        where: { status: 'active' },
        orderBy: { name: 'asc' }
      });
    });
  });

  describe('getWarehouseById', () => {
    it('should return warehouse by id', async () => {
      const mockWarehouse = { id: 'wh-1', name: 'Warehouse 1' };
      mockPrisma.warehouse.findUnique.mockResolvedValue(mockWarehouse as any);

      const result = await manager.getWarehouseById('wh-1');

      expect(result).toEqual(mockWarehouse);
      expect(mockPrisma.warehouse.findUnique).toHaveBeenCalledWith({ where: { id: 'wh-1' } });
    });

    it('should return null when not found', async () => {
      mockPrisma.warehouse.findUnique.mockResolvedValue(null);
      const result = await manager.getWarehouseById('invalid');
      expect(result).toBeNull();
    });
  });

  describe('updateWarehouseStatus', () => {
    it('should update warehouse status', async () => {
      const mockWarehouse = { id: 'wh-1', status: 'inactive' };
      mockPrisma.warehouse.update.mockResolvedValue(mockWarehouse as any);

      const result = await manager.updateWarehouseStatus('wh-1', 'inactive', 'user-1');

      expect(result.status).toBe('inactive');
      expect(mockPrisma.warehouse.update).toHaveBeenCalled();
    });
  });

  describe('checkWarehouseCapacity', () => {
    it('should return capacity info', async () => {
      const result = await manager.checkWarehouseCapacity('wh-1');
      expect(result.hasCapacity).toBe(true);
      expect(result.currentUtilization).toBeDefined();
    });
  });

  describe('getWarehouseUtilization', () => {
    it('should return utilization metrics', async () => {
      mockPrisma.warehouse.findMany.mockResolvedValue([
        { id: 'wh-1', name: 'Warehouse 1', status: 'active' }
      ] as any);

      const result = await manager.getWarehouseUtilization();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('warehouseId');
      expect(result[0]).toHaveProperty('utilization');
    });
  });
});
