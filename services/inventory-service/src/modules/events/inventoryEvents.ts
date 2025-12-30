// Inventory Service Event Definitions
// All events follow the shared event envelope pattern

export interface StockReservedEvent {
  eventId: string;
  eventVersion: number;
  eventType: 'StockReserved';
  producer: string;
  timestamp: string;
  payload: {
    orderId: string;
    orderItemId: string;
    productVariantId: string;
    warehouseId: string;
    quantityReserved: number;
    expiresAt: string;
  };
}

export interface StockReleasedEvent {
  eventId: string;
  eventVersion: number;
  eventType: 'StockReleased';
  producer: string;
  timestamp: string;
  payload: {
    orderId: string;
    productVariantId: string;
    warehouseId: string;
    quantityReleased: number;
    reason: 'cancelled' | 'expired' | 'fulfilled';
  };
}

export interface InventoryUpdatedEvent {
  eventId: string;
  eventVersion: number;
  eventType: 'InventoryUpdated';
  producer: string;
  timestamp: string;
  payload: {
    updates: Array<{
      variantId: string;
      warehouseId: string;
      quantity: number;
      operation: 'add' | 'subtract' | 'set';
    }>;
  };
}

export interface LowStockAlertEvent {
  eventId: string;
  eventVersion: number;
  eventType: 'LowStockAlert';
  producer: string;
  timestamp: string;
  payload: {
    productVariantId: string;
    warehouseId: string;
    currentStock: number;
    reorderPoint: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface InventoryCountCompletedEvent {
  eventId: string;
  eventVersion: number;
  eventType: 'InventoryCountCompleted';
  producer: string;
  timestamp: string;
  payload: {
    inventoryCountId: string;
    warehouseId: string;
    itemsCounted: number;
    discrepanciesFound: number;
    totalValue: number;
  };
}

export interface WarehouseCapacityAlertEvent {
  eventId: string;
  eventVersion: number;
  eventType: 'WarehouseCapacityAlert';
  producer: string;
  timestamp: string;
  payload: {
    warehouseId: string;
    currentUtilization: number;
    capacityThreshold: number;
    recommendedAction: string;
  };
}

export interface InventoryMovementEvent {
  eventId: string;
  eventVersion: number;
  eventType: 'InventoryMovement';
  producer: string;
  timestamp: string;
  payload: {
    productVariantId: string;
    warehouseId: string;
    movementType: 'inbound' | 'outbound' | 'transfer' | 'adjustment' | 'damage';
    quantity: number;
    referenceType?: string;
    referenceId?: string;
    reason?: string;
    performedBy?: string;
  };
}

// Union type for all inventory events
export type InventoryEvent =
  | StockReservedEvent
  | StockReleasedEvent
  | InventoryUpdatedEvent
  | LowStockAlertEvent
  | InventoryCountCompletedEvent
  | WarehouseCapacityAlertEvent
  | InventoryMovementEvent;
