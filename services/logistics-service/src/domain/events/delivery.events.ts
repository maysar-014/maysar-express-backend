export interface DeliveryRequestedEvent {
  eventType: 'DeliveryRequested';
  eventVersion: 'v1';
  eventId: string;
  aggregateId: string; // deliveryId
  occurredAt: Date;
  data: {
    orderId: string;
    pickupLocation: {
      lat: number;
      lng: number;
      address: string;
    };
    deliveryLocation: {
      lat: number;
      lng: number;
      address: string;
    };
    weight: number;
    priority: 'standard' | 'express' | 'urgent';
    specialRequirements?: string[];
  };
}

export interface CourierAssignedEvent {
  eventType: 'CourierAssigned';
  eventVersion: 'v1';
  eventId: string;
  aggregateId: string; // deliveryId
  occurredAt: Date;
  data: {
    courierId: string;
    courierName: string;
    vehicleType: string;
    estimatedArrival: Date;
  };
}

export interface DeliveryPickedUpEvent {
  eventType: 'DeliveryPickedUp';
  eventVersion: 'v1';
  eventId: string;
  aggregateId: string; // deliveryId
  occurredAt: Date;
  data: {
    courierId: string;
    pickupTime: Date;
    actualWeight?: number;
  };
}

export interface DeliveryInTransitEvent {
  eventType: 'DeliveryInTransit';
  eventVersion: 'v1';
  eventId: string;
  aggregateId: string; // deliveryId
  occurredAt: Date;
  data: {
    courierId: string;
    route: {
      waypoints: Array<{
        lat: number;
        lng: number;
        type: 'pickup' | 'delivery' | 'waypoint';
      }>;
      estimatedDuration: number;
    };
  };
}

export interface DeliveryDeliveredEvent {
  eventType: 'DeliveryDelivered';
  eventVersion: 'v1';
  eventId: string;
  aggregateId: string; // deliveryId
  occurredAt: Date;
  data: {
    courierId: string;
    deliveryTime: Date;
    recipientName?: string;
    deliveryNotes?: string;
  };
}

export interface DeliveryFailedEvent {
  eventType: 'DeliveryFailed';
  eventVersion: 'v1';
  eventId: string;
  aggregateId: string; // deliveryId
  occurredAt: Date;
  data: {
    courierId: string;
    failureReason: string;
    failureType: 'customer_unavailable' | 'wrong_address' | 'package_damaged' | 'vehicle_issue' | 'other';
    retryPossible: boolean;
  };
}

export interface DeliveryCancelledEvent {
  eventType: 'DeliveryCancelled';
  eventVersion: 'v1';
  eventId: string;
  aggregateId: string; // deliveryId
  occurredAt: Date;
  data: {
    cancelledBy: 'customer' | 'system' | 'courier';
    reason: string;
    refundAmount?: number;
  };
}

export type DeliveryEvent =
  | DeliveryRequestedEvent
  | CourierAssignedEvent
  | DeliveryPickedUpEvent
  | DeliveryInTransitEvent
  | DeliveryDeliveredEvent
  | DeliveryFailedEvent
  | DeliveryCancelledEvent;
