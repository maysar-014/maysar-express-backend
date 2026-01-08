export enum VehicleType {
  BICYCLE = 'bicycle',
  MOTORCYCLE = 'motorcycle',
  CAR = 'car',
  TRUCK = 'truck'
}

export enum VehicleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired'
}

export interface VehicleCapacity {
  maxWeight: number; // kg
  maxVolume: number; // cubic meters
  maxItems: number;
}

export interface MaintenanceRecord {
  date: Date;
  type: 'routine' | 'repair' | 'inspection';
  description: string;
  cost: number;
  nextDueDate?: Date;
}

export class Vehicle {
  public id: string;
  public courierId: string;
  public type: VehicleType;
  public status: VehicleStatus;
  public licensePlate: string;
  public capacity: VehicleCapacity;
  public currentLocation?: { lat: number; lng: number };
  public maintenanceRecords: MaintenanceRecord[];
  public lastMaintenanceDate?: Date;
  public nextMaintenanceDue?: Date;
  public totalDeliveries: number;
  public totalDistance: number; // km
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: any) {
    this.id = data.id || this.generateId();
    this.courierId = data.courierId;
    this.type = data.type;
    this.status = VehicleStatus.ACTIVE;
    this.licensePlate = data.licensePlate;
    this.capacity = this.getDefaultCapacity(data.type);
    this.maintenanceRecords = [];
    this.totalDeliveries = 0;
    this.totalDistance = 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  canHandleOrder(weight: number, volume: number, itemCount: number): { canHandle: boolean; reason?: string } {
    if (this.status !== VehicleStatus.ACTIVE) {
      return { canHandle: false, reason: 'Vehicle not active' };
    }

    if (weight > this.capacity.maxWeight) {
      return { canHandle: false, reason: `Weight exceeds capacity (${weight}kg > ${this.capacity.maxWeight}kg)` };
    }

    if (volume > this.capacity.maxVolume) {
      return { canHandle: false, reason: `Volume exceeds capacity (${volume}m³ > ${this.capacity.maxVolume}m³)` };
    }

    if (itemCount > this.capacity.maxItems) {
      return { canHandle: false, reason: `Item count exceeds capacity (${itemCount} > ${this.capacity.maxItems})` };
    }

    return { canHandle: true };
  }

  needsMaintenance(): boolean {
    if (!this.nextMaintenanceDue) return false;
    return new Date() >= this.nextMaintenanceDue;
  }

  addMaintenanceRecord(record: MaintenanceRecord): void {
    this.maintenanceRecords.push(record);
    this.lastMaintenanceDate = record.date;
    this.nextMaintenanceDue = record.nextDueDate;
    this.updatedAt = new Date();
  }

  updateLocation(location: { lat: number; lng: number }): void {
    this.currentLocation = location;
    this.updatedAt = new Date();
  }

  completeDelivery(distance: number): void {
    this.totalDeliveries++;
    this.totalDistance += distance;
    this.updatedAt = new Date();
  }

  private getDefaultCapacity(type: VehicleType): VehicleCapacity {
    switch (type) {
      case VehicleType.BICYCLE:
        return { maxWeight: 15, maxVolume: 0.1, maxItems: 5 };
      case VehicleType.MOTORCYCLE:
        return { maxWeight: 50, maxVolume: 0.3, maxItems: 10 };
      case VehicleType.CAR:
        return { maxWeight: 200, maxVolume: 2.0, maxItems: 50 };
      case VehicleType.TRUCK:
        return { maxWeight: 1000, maxVolume: 10.0, maxItems: 200 };
      default:
        return { maxWeight: 50, maxVolume: 0.3, maxItems: 10 };
    }
  }

  private generateId(): string {
    return `vehicle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}