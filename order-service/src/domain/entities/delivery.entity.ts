export enum DeliveryStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface DeliveryAddress {
  street: string;
  city: string;
  region: string;
  postalCode?: string;
  coordinates?: { lat: number; lng: number };
  instructions?: string;
}

export class Delivery {
  public id: string;
  public orderId: string;
  public courierId?: string;
  public status: DeliveryStatus;
  public pickupAddress: DeliveryAddress;
  public deliveryAddress: DeliveryAddress;
  public estimatedPickupTime?: Date;
  public actualPickupTime?: Date;
  public estimatedDeliveryTime?: Date;
  public actualDeliveryTime?: Date;
  public trackingNumber: string;
  public deliveryInstructions?: string;
  public failureReason?: string;
  public retryCount: number;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: any) {
    this.id = data.id || this.generateId();
    this.orderId = data.orderId;
    this.courierId = data.courierId;
    this.status = DeliveryStatus.PENDING;
    this.pickupAddress = data.pickupAddress;
    this.deliveryAddress = data.deliveryAddress;
    this.trackingNumber = this.generateTrackingNumber();
    this.deliveryInstructions = data.deliveryInstructions;
    this.retryCount = 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  assignCourier(courierId: string, estimatedPickupTime: Date): void {
    this.courierId = courierId;
    this.status = DeliveryStatus.ASSIGNED;
    this.estimatedPickupTime = estimatedPickupTime;
    this.updatedAt = new Date();
  }

  updateStatus(newStatus: DeliveryStatus, timestamp?: Date): void {
    this.status = newStatus;
    this.updatedAt = new Date();

    switch (newStatus) {
      case DeliveryStatus.PICKED_UP:
        this.actualPickupTime = timestamp || new Date();
        break;
      case DeliveryStatus.DELIVERED:
        this.actualDeliveryTime = timestamp || new Date();
        break;
      case DeliveryStatus.FAILED:
        this.retryCount++;
        break;
    }
  }

  canRetry(): boolean {
    return this.status === DeliveryStatus.FAILED && this.retryCount < 3;
  }

  isOverdue(): boolean {
    if (!this.estimatedDeliveryTime) return false;
    return new Date() > this.estimatedDeliveryTime && this.status !== DeliveryStatus.DELIVERED;
  }

  private generateId(): string {
    return `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTrackingNumber(): string {
    const prefix = 'MYS';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }
}