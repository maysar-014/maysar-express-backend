// Order Service Event Definitions
// Complete event contracts for order lifecycle

export interface OrderCreatedEvent {
  eventId: string;
  eventType: 'OrderCreated.v1';
  eventVersion: 1;
  producer: 'order-service';
  timestamp: string;
  entityType: 'order';
  entityId: string;
  userId: string;
  payload: {
    orderId: string;
    orderNumber: string;
    userId: string;
    totalAmount: number;
    currency: string;
    items: Array<{
      productVariantId: string;
      sellerId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    shippingAddress: any;
    billingAddress?: any;
  };
  metadata?: Record<string, any>;
}

export interface OrderPaidEvent {
  eventId: string;
  eventType: 'OrderPaid.v1';
  eventVersion: 1;
  producer: 'payment-service';
  timestamp: string;
  entityType: 'order';
  entityId: string;
  userId: string;
  payload: {
    orderId: string;
    paymentId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    transactionId: string;
  };
  metadata?: Record<string, any>;
}

export interface OrderShippedEvent {
  eventId: string;
  eventType: 'OrderShipped.v1';
  eventVersion: 1;
  producer: 'logistics-service';
  timestamp: string;
  entityType: 'order';
  entityId: string;
  userId: string;
  payload: {
    orderId: string;
    shipmentId: string;
    trackingNumber: string;
    carrier: string;
    estimatedDelivery: string;
    items: Array<{
      productVariantId: string;
      quantity: number;
    }>;
  };
  metadata?: Record<string, any>;
}

export interface OrderDeliveredEvent {
  eventId: string;
  eventType: 'OrderDelivered.v1';
  eventVersion: 1;
  producer: 'logistics-service';
  timestamp: string;
  entityType: 'order';
  entityId: string;
  userId: string;
  payload: {
    orderId: string;
    shipmentId: string;
    deliveryTimestamp: string;
    recipientName?: string;
    deliveryLocation?: any;
  };
  metadata?: Record<string, any>;
}

export interface OrderCancelledEvent {
  eventId: string;
  eventType: 'OrderCancelled.v1';
  eventVersion: 1;
  producer: 'order-service';
  timestamp: string;
  entityType: 'order';
  entityId: string;
  userId: string;
  payload: {
    orderId: string;
    reason: string;
    cancelledBy: string;
    refundAmount?: number;
  };
  metadata?: Record<string, any>;
}

export interface OrderRefundedEvent {
  eventId: string;
  eventType: 'OrderRefunded.v1';
  eventVersion: 1;
  producer: 'payment-service';
  timestamp: string;
  entityType: 'order';
  entityId: string;
  userId: string;
  payload: {
    orderId: string;
    refundId: string;
    amount: number;
    currency: string;
    reason: string;
  };
  metadata?: Record<string, any>;
}

// Union type for all order events
export type OrderEvent =
  | OrderCreatedEvent
  | OrderPaidEvent
  | OrderShippedEvent
  | OrderDeliveredEvent
  | OrderCancelledEvent
  | OrderRefundedEvent;
