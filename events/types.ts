// Event Type Definitions - Generated from Event Catalog
// DO NOT MODIFY MANUALLY - Update via schema registry

export interface BaseEventPayload {
  version: string;
}

// ORDER DOMAIN EVENTS
export interface OrderCreatedPayload extends BaseEventPayload {
  orderId: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  items: Array<{
    productVariantId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  currency: 'TZS' | 'USD' | 'EUR';
  shippingAddress: object;
  billingAddress?: object;
}

export interface OrderCancelledPayload extends BaseEventPayload {
  orderId: string;
  reason: string;
  cancelledBy: string;
  refundAmount?: number;
}

// PAYMENT DOMAIN EVENTS
export interface PaymentSucceededPayload extends BaseEventPayload {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: 'TZS' | 'USD' | 'EUR';
  paymentMethod: 'card' | 'mobile_money' | 'bank_transfer';
  transactionId?: string;
}

export interface PaymentFailedPayload extends BaseEventPayload {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: 'TZS' | 'USD' | 'EUR';
  reason: 'insufficient_funds' | 'invalid_card' | 'fraud_detected' | 'system_error';
  errorCode?: string;
}

export interface PaymentRefundCompletedPayload extends BaseEventPayload {
  paymentId: string;
  orderId: string;
  refundId: string;
  amount: number;
  currency: 'TZS' | 'USD' | 'EUR';
  reason: string;
}

// INVENTORY DOMAIN EVENTS
export interface InventoryReservedPayload extends BaseEventPayload {
  orderId: string;
  reservations: Array<{
    productVariantId: string;
    warehouseId: string;
    quantity: number;
    reservationId: string;
    expiresAt?: string;
  }>;
}

export interface InventoryReleasedPayload extends BaseEventPayload {
  orderId: string;
  reservationIds: string[];
  reason: 'order_cancelled' | 'payment_failed' | 'expired';
}

export interface InventoryLowStockPayload extends BaseEventPayload {
  productVariantId: string;
  warehouseId: string;
  currentStock: number;
  minimumStock: number;
  sellerId: string;
}

// SELLER DOMAIN EVENTS
export interface SellerRegisteredPayload extends BaseEventPayload {
  sellerId: string;
  email: string;
  businessName: string;
  registeredAt: string;
}

export interface SellerKycApprovedPayload extends BaseEventPayload {
  sellerId: string;
  approvedBy: string;
  approvedAt: string;
  kycLevel: 'basic' | 'enhanced' | 'premium';
  documents?: Array<{
    type: string;
    verified: boolean;
  }>;
}

export interface SellerKycRejectedPayload extends BaseEventPayload {
  sellerId: string;
  rejectedBy: string;
  rejectedAt: string;
  reason: string;
  requiredDocuments?: string[];
}

export interface SellerActivatedPayload extends BaseEventPayload {
  sellerId: string;
  activatedAt: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

// LOGISTICS DOMAIN EVENTS
export interface LogisticsPickupAssignedPayload extends BaseEventPayload {
  orderId: string;
  shipmentId: string;
  courierId: string;
  pickupAddress: object;
  scheduledAt: string;
}

export interface LogisticsDeliveryCompletedPayload extends BaseEventPayload {
  orderId: string;
  shipmentId: string;
  deliveredAt: string;
  recipientName?: string;
  deliveryLocation?: object;
  proofOfDelivery?: {
    signature?: string;
    photo?: string;
  };
}

// COMMISSION DOMAIN EVENTS
export interface CommissionCalculatedPayload extends BaseEventPayload {
  orderId: string;
  commissions: Array<{
    recipientId: string;
    recipientType: 'seller' | 'enabler' | 'courier';
    amount: number;
    currency: 'TZS' | 'USD' | 'EUR';
    rate: number;
  }>;
}

export interface CommissionPaidPayload extends BaseEventPayload {
  commissionId: string;
  recipientId: string;
  amount: number;
  currency: 'TZS' | 'USD' | 'EUR';
  paidAt: string;
  paymentMethod: string;
}

// TRUST DOMAIN EVENTS
export interface ReviewSubmittedPayload extends BaseEventPayload {
  reviewId: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  rating: number;
  comment?: string;
  submittedAt: string;
}

export interface DisputeOpenedPayload extends BaseEventPayload {
  disputeId: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  reason: string;
  description: string;
  openedAt: string;
}

export interface DisputeResolvedPayload extends BaseEventPayload {
  disputeId: string;
  orderId: string;
  resolution: 'refund' | 'uphold' | 'split';
  amount?: number;
  resolvedBy: string;
  resolvedAt: string;
}

// NOTIFICATION DOMAIN EVENTS
export interface NotificationSentPayload extends BaseEventPayload {
  notificationId: string;
  userId: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  type: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'failed';
}

// EVENT ENVELOPE
export interface EventEnvelope<T = any> {
  eventId: string;
  eventType: string;
  timestamp: string;
  correlationId: string;
  causationId?: string;
  producer: string;
  version: string;
  payload: T;
}

// EVENT TYPE UNION
export type EventPayload = 
  | OrderCreatedPayload
  | OrderCancelledPayload
  | PaymentSucceededPayload
  | PaymentFailedPayload
  | PaymentRefundCompletedPayload
  | InventoryReservedPayload
  | InventoryReleasedPayload
  | InventoryLowStockPayload
  | SellerRegisteredPayload
  | SellerKycApprovedPayload
  | SellerKycRejectedPayload
  | SellerActivatedPayload
  | LogisticsPickupAssignedPayload
  | LogisticsDeliveryCompletedPayload
  | CommissionCalculatedPayload
  | CommissionPaidPayload
  | ReviewSubmittedPayload
  | DisputeOpenedPayload
  | DisputeResolvedPayload
  | NotificationSentPayload;

// EVENT FACTORY
export class EventFactory {
  static createOrderCreated(payload: Omit<OrderCreatedPayload, 'version'>): OrderCreatedPayload {
    return { ...payload, version: 'v1' };
  }

  static createPaymentSucceeded(payload: Omit<PaymentSucceededPayload, 'version'>): PaymentSucceededPayload {
    return { ...payload, version: 'v1' };
  }

  static createInventoryReserved(payload: Omit<InventoryReservedPayload, 'version'>): InventoryReservedPayload {
    return { ...payload, version: 'v1' };
  }

  // Add more factory methods as needed
}