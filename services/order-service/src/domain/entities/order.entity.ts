import { Address } from '../value-objects/address.value-object';
import { Money } from '../value-objects/money.value-object';

export enum OrderStatus {
  DRAFT = 'DRAFT',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  ASSIGNED = 'assigned',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'cancelled',

  // Seller stock verification workflow
  PENDING_SELLER_VERIFICATION = 'PENDING_SELLER_VERIFICATION',
  SELLER_REVIEWING            = 'SELLER_REVIEWING',
  SELLER_CONFIRMED            = 'SELLER_CONFIRMED',
  SELLER_VERIFIED             = 'SELLER_VERIFIED',
  SELLER_REJECTED             = 'SELLER_REJECTED',
  SELLER_DECLINED             = 'SELLER_DECLINED',
  PAYMENT_PENDING             = 'PAYMENT_PENDING',
  ORDER_PLACED                = 'ORDER_PLACED',
  VERIFICATION_OVERDUE        = 'VERIFICATION_OVERDUE',
  UNDER_ADMIN_REVIEW          = 'UNDER_ADMIN_REVIEW',
}

export class Order {
  public id: string;
  public buyerId: string;
  public sellerId: string;
  public enablerId?: string;
  public enablerCode?: string;
  public items: OrderItem[];
  public totalAmount: Money;
  public totalWeight: number;
  public status: OrderStatus;
  public cancelReason?: string;
  public cancelledAt?: Date;
  public paymentMethod: 'cod' | 'wallet' | 'card' | 'mobile_money' | 'direct_payment' | 'seller_verification' | string;
  public deliveryAddress: Address;
  public createdAt: Date;
  public updatedAt: Date;
  public version: number;

  // Order source and completion method
  public orderSource: 'CART' | 'DIRECT' = 'CART';
  public orderCompletionMethod?: 'WALLET' | 'DIRECT_PAYMENT' | 'SELLER_VERIFICATION' | 'COD' | 'MOBILE_MONEY';
  public chatConversationId?: string;
  public declineReason?: string;

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

  // Delivery confirmation code — shown to buyer, verified by courier at delivery
  public deliveryCode?: string;
  public deliveryCodeUsedAt?: Date;

  // Seller stock verification fields
  public verificationDeadlineAt?: Date;
  public verificationTimeoutMinutes?: number;

  // Delivery economics. `deliveryFee` is what the COD commitment hold is sized
  // from at buyer confirm-checkout; without it the hold was always 0 and COD
  // orders were confirmed with no funds secured.
  public deliveryFee?: number;
  public logisticsEstimate?: number;

  // Fulfillment location — resolved at checkout, used by courier for pickup coords
  public fulfillmentLocationId?: string;

  constructor(data: any) {
    // ID must be provided - no infrastructure dependencies in domain
    if (!data.id) {
      throw new Error('Order ID must be provided');
    }

    this.id = data.id;
    this.buyerId = data.buyerId;
    this.sellerId = data.sellerId;
    this.enablerId = data.enablerId;
    this.enablerCode = data.enablerCode;
    this.items = data.items || [];
    this.totalAmount = new Money(data.totalAmount, data.currency || 'TZS');
    this.totalWeight = data.totalWeight;
    this.status = data.status || OrderStatus.PENDING;
    this.cancelReason = data.cancelReason || data.cancellationReason;
    if (data.cancelledAt) this.cancelledAt = new Date(data.cancelledAt);
    this.paymentMethod = data.paymentMethod;
    this.deliveryAddress = new Address(
      data.deliveryAddress.street,
      data.deliveryAddress.city,
      data.deliveryAddress.postalCode,
      data.deliveryAddress.country,
      data.deliveryAddress.latitude,
      data.deliveryAddress.longitude,
      {
        ward: data.deliveryAddress.ward,
        district: data.deliveryAddress.district,
        region: data.deliveryAddress.region,
      }
    );
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
    this.version = data.version ?? 0;

    this.orderSource = data.orderSource || data.checkoutSource || 'CART';
    this.orderCompletionMethod = data.orderCompletionMethod;
    this.chatConversationId = data.chatConversationId;
    this.declineReason = data.declineReason;

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
    this.deliveryCode = data.deliveryCode;
    if (data.deliveryCodeUsedAt) this.deliveryCodeUsedAt = new Date(data.deliveryCodeUsedAt);

    // Verification fields
    if (data.verificationDeadlineAt) this.verificationDeadlineAt = new Date(data.verificationDeadlineAt);
    this.verificationTimeoutMinutes = data.verificationTimeoutMinutes ?? 30;
    this.fulfillmentLocationId = data.fulfillmentLocationId;
    this.deliveryFee = data.deliveryFee;
    this.logisticsEstimate = data.logisticsEstimate;
  }

  updateStatus(newStatus: OrderStatus): void {
    this.status = newStatus;
    this.updatedAt = new Date();
  }

  canBeCancelled(): boolean {
    return [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PENDING_SELLER_VERIFICATION,
      OrderStatus.SELLER_VERIFIED,
      OrderStatus.VERIFICATION_OVERDUE,
      OrderStatus.UNDER_ADMIN_REVIEW,
    ].includes(this.status);
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
