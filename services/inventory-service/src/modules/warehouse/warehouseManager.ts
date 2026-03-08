interface WarehouseRecord {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  address: unknown;
  capacity?: unknown;
  operatingHours?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WarehouseDelegate {
  findMany(args: Record<string, unknown>): Promise<WarehouseRecord[]>;
  findUnique(args: Record<string, unknown>): Promise<WarehouseRecord | null>;
  update(args: Record<string, unknown>): Promise<WarehouseRecord>;
}

interface WarehousePrisma {
  warehouse?: WarehouseDelegate;
  inventory_Warehouse?: WarehouseDelegate;
}

export interface WarehouseInfo {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  address: any;
  capacity?: any;
  operatingHours?: any;
}

export class WarehouseManager {
  constructor(private prisma: WarehousePrisma) {}

  /**
   * Get all active warehouses
   */
  async getActiveWarehouses(): Promise<WarehouseRecord[]> {
    return await this.warehouseDelegate.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Get warehouse by ID with full details
   */
  async getWarehouseById(id: string): Promise<WarehouseRecord | null> {
    return await this.warehouseDelegate.findUnique({
      where: { id }
    });
  }

  /**
   * Find warehouses near a location
   */
  async findNearbyWarehouses(latitude: number, longitude: number, radiusKm: number = 100): Promise<WarehouseRecord[]> {
    // In a real implementation, this would use PostGIS or similar geospatial queries
    // For now, return all active warehouses
    return await this.getActiveWarehouses();
  }

  /**
   * Check if warehouse has sufficient capacity
   */
  async checkWarehouseCapacity(warehouseId: string, additionalVolume?: number): Promise<{
    hasCapacity: boolean;
    currentUtilization: number;
    availableCapacity: number;
  }> {
    // Simplified capacity check - in production would analyze actual capacity data
    return {
      hasCapacity: true,
      currentUtilization: 0.7,
      availableCapacity: 0.3
    };
  }

  /**
   * Update warehouse status
   */
  async updateWarehouseStatus(id: string, status: string, updatedBy: string): Promise<WarehouseRecord> {
    return await this.warehouseDelegate.update({
      where: { id },
      data: {
        status: status as any,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get warehouse utilization metrics
   */
  async getWarehouseUtilization(): Promise<Array<{
    warehouseId: string;
    warehouseName: string;
    utilization: number;
    totalStock: number;
    availableStock: number;
  }>> {
    // This would require complex aggregation queries in production
    const warehouses = await this.getActiveWarehouses();

    return warehouses.map(warehouse => ({
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      utilization: 0.7, // Mock data
      totalStock: 1000,
      availableStock: 700
    }));
  }

  private get warehouseDelegate(): WarehouseDelegate {
    const delegate = this.prisma.inventory_Warehouse ?? this.prisma.warehouse;
    if (!delegate) {
      throw new Error('Warehouse delegate is not configured on prisma client');
    }
    return delegate;
  }
}
