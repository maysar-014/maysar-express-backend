// @ts-nocheck
export interface DeliveryAddress {
  street: string;
  city: string;
  region: string;
  postalCode?: string;
  coordinates: { lat: number; lng: number };
  contactName: string;
  contactPhone: string;
}

export interface DeliveryPackage {
  weight: number;
  dimensions: { length: number; width: number; height: number };
  value: number;
  fragile: boolean;
  perishable: boolean;
  items: Array<{
    name: string;
    quantity: number;
    value: number;
  }>;
}

export type DeliveryStatus = 
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface DeliveryTimestamps {
  created: Date;
  assigned?: Date;
  pickedUp?: Date;
  inTransit?: Date;
  outForDelivery?: Date;
  delivered?: Date;
  failed?: Date;
  cancelled?: Date;
}

export class DeliveryEntity {
  constructor(
    public readonly id: string,
    public readonly orderId: string,
    public readonly pickupAddress: DeliveryAddress,
    public readonly deliveryAddress: DeliveryAddress,
    public readonly packageDetails: DeliveryPackage,
    public status: DeliveryStatus,
    public courierId?: string,
    public trackingNumber?: string,
    public estimatedDeliveryTime?: Date,
    public actualDeliveryTime?: Date,
    public timestamps: DeliveryTimestamps = { created: new Date() },
    public notes?: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  assignCourier(courierId: string): void {
    if (this.status !== 'pending') {
      throw new Error(`Cannot assign courier to delivery with status: ${this.status}`);
    }
    
    this.courierId = courierId;
    this.status = 'assigned';
    this.timestamps.assigned = new Date();
    this.updatedAt = new Date();
  }

  markAsPickedUp(): void {
    if (this.status !== 'assigned') {
      throw new Error(`Cannot mark as picked up. Current status: ${this.status}`);
    }
    
    this.status = 'picked_up';
    this.timestamps.pickedUp = new Date();
    this.updatedAt = new Date();
  }

  markAsInTransit(): void {
    if (this.status !== 'picked_up') {
      throw new Error(`Cannot mark as in transit. Current status: ${this.status}`);
    }
    
    this.status = 'in_transit';
    this.timestamps.inTransit = new Date();
    this.updatedAt = new Date();
  }

  markAsOutForDelivery(): void {
    if (this.status !== 'in_transit') {
      throw new Error(`Cannot mark as out for delivery. Current status: ${this.status}`);
    }
    
    this.status = 'out_for_delivery';
    this.timestamps.outForDelivery = new Date();
    this.updatedAt = new Date();
  }

  markAsDelivered(): void {
    if (this.status !== 'out_for_delivery') {
      throw new Error(`Cannot mark as delivered. Current status: ${this.status}`);
    }
    
    this.status = 'delivered';
    this.actualDeliveryTime = new Date();
    this.timestamps.delivered = new Date();
    this.updatedAt = new Date();
  }

  markAsFailed(reason: string): void {
    if (['delivered', 'cancelled'].includes(this.status)) {
      throw new Error(`Cannot mark as failed. Current status: ${this.status}`);
    }
    
    this.status = 'failed';
    this.notes = reason;
    this.timestamps.failed = new Date();
    this.updatedAt = new Date();
  }

  cancel(reason: string): void {
    if (['delivered', 'failed'].includes(this.status)) {
      throw new Error(`Cannot cancel delivery. Current status: ${this.status}`);
    }
    
    this.status = 'cancelled';
    this.notes = reason;
    this.timestamps.cancelled = new Date();
    this.updatedAt = new Date();
  }

  isCompleted(): boolean {
    return ['delivered', 'failed', 'cancelled'].includes(this.status);
  }

  isActive(): boolean {
    return !this.isCompleted();
  }

  getDeliveryDuration(): number | null {
    if (!this.timestamps.delivered || !this.timestamps.assigned) {
      return null;
    }
    return this.timestamps.delivered.getTime() - this.timestamps.assigned.getTime();
  }

  isOnTime(): boolean {
    if (!this.actualDeliveryTime || !this.estimatedDeliveryTime) {
      return false;
    }
    return this.actualDeliveryTime <= this.estimatedDeliveryTime;
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.id) errors.push('Delivery ID is required');
    if (!this.orderId) errors.push('Order ID is required');
    if (!this.pickupAddress) errors.push('Pickup address is required');
    if (!this.deliveryAddress) errors.push('Delivery address is required');
    if (!this.packageDetails) errors.push('Package information is required');

    if (this.packageDetails) {
      if (this.packageDetails.weight <= 0) errors.push('Package weight must be positive');
      if (this.packageDetails.value <= 0) errors.push('Package value must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
