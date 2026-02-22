import { Address } from '../value-objects/address.value-object';
import { Money } from '../value-objects/money.value-object';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  ASSIGNED = 'assigned',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export class Order {
  public id: string;
  public buyerId: string;
  public sellerId: string;
  public items: OrderItem[];
  public totalAmount: Money;
  public totalWeight: number;
  public status: OrderStatus;
  public paymentMethod: 'cod' | 'card' | 'mobile_money';
  public deliveryAddress: Address;
  public createdAt: Date;
  public updatedAt: Date;

  // COD Specific Fields
  public codCommitmentFee?: number;
  public codCommitmentPaid: boolean = false;
  public codReputationScore?: number;
  public codEligibilityChecked: boolean = false;
  public codDeliveryOtp?: string;
  public codOtpExpiresAt?: Date;
  public codDeliveryConfirmedAt?: Date;
  public codDeliveryConfirmedBy?: string;
  public codProofGpsLat?: number;
  public codProofGpsLng?: number;
  public codProofTimestamp?: Date;
  public codCommitmentHoldId?: string;

  constructor(data: any) {
    // ID must be provided - no infrastructure dependencies in domain
    if (!data.id) {
      throw new Error('Order ID must be provided');
    }

    this.id = data.id;
    this.buyerId = data.buyerId;
    this.sellerId = data.sellerId;
    this.items = data.items || [];
    this.totalAmount = new Money(data.totalAmount, data.currency || 'TZS');
    this.totalWeight = data.totalWeight;
    this.status = OrderStatus.PENDING;
    this.paymentMethod = data.paymentMethod;
    this.deliveryAddress = new Address(
      data.deliveryAddress.street,
      data.deliveryAddress.city,
      data.deliveryAddress.postalCode,
      data.deliveryAddress.country,
      data.deliveryAddress.latitude,
      data.deliveryAddress.longitude
    );
    this.createdAt = new Date();
    this.updatedAt = new Date();

    // Assign COD fields if provided
    this.codCommitmentFee = data.codCommitmentFee;
    this.codCommitmentPaid = data.codCommitmentPaid || false;
    this.codReputationScore = data.codReputationScore;
    this.codEligibilityChecked = data.codEligibilityChecked || false;
    this.codDeliveryOtp = data.codDeliveryOtp;
    if (data.codOtpExpiresAt) this.codOtpExpiresAt = new Date(data.codOtpExpiresAt);
    if (data.codDeliveryConfirmedAt) this.codDeliveryConfirmedAt = new Date(data.codDeliveryConfirmedAt);
    this.codDeliveryConfirmedBy = data.codDeliveryConfirmedBy;
    this.codProofGpsLat = data.codProofGpsLat;
    this.codProofGpsLng = data.codProofGpsLng;
    if (data.codProofTimestamp) this.codProofTimestamp = new Date(data.codProofTimestamp);
    this.codCommitmentHoldId = data.codCommitmentHoldId;
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
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: Money;
  weight: number;
}
