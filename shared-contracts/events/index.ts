import { UUID, Money, UserRole, OrderStatus, PaymentStatus } from '../types';

export interface UserRegisteredEvent {
  version: string;
  userId: UUID;
  email: string;
  role: UserRole;
}

export interface UserSuspendedEvent {
  version: string;
  userId: UUID;
  reason: string;
}

export interface SellerVerifiedEvent {
  version: string;
  sellerId: UUID;
  kycStatus: 'verified' | 'pending' | 'rejected';
}

export interface ProductPublishedEvent {
  version: string;
  productId: UUID;
  sellerId: UUID;
  name: string;
  price: Money;
}

export interface OrderCreatedEvent {
  version: string;
  orderId: UUID;
  buyerId: UUID;
  items: Array<{
    productId: UUID;
    quantity: number;
    price: Money;
  }>;
  totalAmount: Money;
}

export interface OrderPaidEvent {
  version: string;
  orderId: UUID;
  buyerId: UUID;
  amount: Money;
  paymentId: UUID;
}

export interface InventoryReservedEvent {
  version: string;
  orderId: UUID;
  reservations: Array<{
    productId: UUID;
    warehouseId: UUID;
    quantity: number;
    reservationId: UUID;
  }>;
}

export interface OrderShippedEvent {
  version: string;
  orderId: UUID;
  logisticsId: UUID;
  trackingNumber?: string;
}

export interface OrderDeliveredEvent {
  version: string;
  orderId: UUID;
  deliveredAt: string;
}

export interface OrderCancelledEvent {
  version: string;
  orderId: UUID;
  cancelledAt: string;
  reason: string;
  cancelledBy: string;
}

export interface PaymentSucceededEvent {
  version: string;
  paymentId: UUID;
  orderId: UUID;
  amount: Money;
}

export interface RefundCompletedEvent {
  version: string;
  paymentId: UUID;
  orderId: UUID;
  amount: Money;
  reason: string;
}

export interface CommissionEarnedEvent {
  version: string;
  commissionId: UUID;
  orderId: UUID;
  amount: Money;
  recipientId: UUID;
  recipientType: 'seller' | 'enabler';
}

export interface AdminOverrideAppliedEvent {
  version: string;
  adminId: UUID;
  action: string;
  entityType: string;
  entityId: UUID;
  reason: string;
  previousState?: any;
  newState?: any;
}

export interface DisputeOpenedEvent {
  version: string;
  disputeId: UUID;
  orderId: UUID;
  buyerId: UUID;
  sellerId: UUID;
  reason: string;
}

export interface DisputeResolvedEvent {
  version: string;
  disputeId: UUID;
  orderId: UUID;
  resolution: 'refund' | 'uphold' | 'split';
  amount?: Money;
}

// Event type union for type safety
export type EventPayload =
  | UserRegisteredEvent
  | UserSuspendedEvent
  | SellerVerifiedEvent
  | ProductPublishedEvent
  | OrderCreatedEvent
  | OrderPaidEvent
  | InventoryReservedEvent
  | OrderShippedEvent
  | OrderDeliveredEvent
  | OrderCancelledEvent
  | PaymentSucceededEvent
  | RefundCompletedEvent
  | CommissionEarnedEvent
  | AdminOverrideAppliedEvent
  | DisputeOpenedEvent
  | DisputeResolvedEvent;
