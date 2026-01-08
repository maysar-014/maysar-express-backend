export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ASSIGNED = 'assigned',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export class Order {
  public id: string;
  public buyerId: string;
  public sellerId: string;
  public items: OrderItem[];
  public totalAmount: number;
  public totalWeight: number;
  public status: OrderStatus;
  public paymentMethod: 'COD' | 'WALLET' | 'CARD';
  public deliveryAddress: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: any) {
    this.id = data.id || this.generateId();
    this.buyerId = data.buyerId;
    this.sellerId = data.sellerId;
    this.items = data.items || [];
    this.totalAmount = data.totalAmount;
    this.totalWeight = data.totalWeight;
    this.status = OrderStatus.PENDING;
    this.paymentMethod = data.paymentMethod;
    this.deliveryAddress = data.deliveryAddress;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  updateStatus(newStatus: OrderStatus): void {
    this.status = newStatus;
    this.updatedAt = new Date();
  }

  canBeCancelled(): boolean {
    return [OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(this.status);
  }

  isHeavyOrder(): boolean {
    return this.totalWeight > 20;
  }

  private generateId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  weight: number;
}