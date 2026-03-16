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
    const warehouses = await this.getActiveWarehouses();
    const toRadians = (deg: number) => (deg * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const dLat = toRadians(lat2 - lat1);
      const dLon = toRadians(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
          Math.cos(toRadians(lat2)) *
          Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return earthRadiusKm * c;
    };

    return warehouses.filter((warehouse) => {
      const address = warehouse.address as any;
      const lat = address?.latitude ?? address?.lat;
      const lon = address?.longitude ?? address?.lng ?? address?.lon;
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return false;
      }
      return distanceKm(latitude, longitude, lat, lon) <= radiusKm;
    });
  }

  /**
   * Check if warehouse has sufficient capacity
   */
  async checkWarehouseCapacity(warehouseId: string, additionalVolume?: number): Promise<{
    hasCapacity: boolean;
    currentUtilization: number;
    availableCapacity: number;
  }> {
    throw new Error('Warehouse capacity checks require real capacity data and are not implemented.');
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
    throw new Error('Warehouse utilization metrics require real inventory aggregation and are not implemented.');
  }

  private get warehouseDelegate(): WarehouseDelegate {
    const delegate = this.prisma.inventory_Warehouse ?? this.prisma.warehouse;
    if (!delegate) {
      throw new Error('Warehouse delegate is not configured on prisma client');
    }
    return delegate;
  }
}
