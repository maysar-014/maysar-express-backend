import { Saga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

export interface OrderData {
  orderId: string;
  sellerId: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: any;
  paymentMethod: string;
}

// Order Processing Saga
export class OrderProcessingSaga extends Saga {
  constructor() {
    super('OrderProcessing');
  }

  async execute(context: SagaContext<OrderData>): Promise<void> {
    await this.addStep(new OrderReceivedStep());
    await this.addStep(new InventoryCheckStep());
    await this.addStep(new PaymentVerificationStep());
    await this.addStep(new FulfillmentStep());
    await this.addStep(new ShippingStep());
  }
}

class OrderReceivedStep extends SagaStep {
  async execute(context: SagaContext<OrderData>): Promise<void> {
    const { orderId, sellerId, customerId } = context.data;
    
    await eventBus.publish('OrderReceived.v1', {
      orderId,
      sellerId,
      customerId,
      receivedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<OrderData>): Promise<void> {
    await eventBus.publish('OrderCancelled.v1', {
      orderId: context.data.orderId,
      sagaId: context.sagaId
    });
  }
}

class InventoryCheckStep extends SagaStep {
  async execute(context: SagaContext<OrderData>): Promise<void> {
    const { orderId, items } = context.data;
    
    for (const item of items) {
      await eventBus.publish('InventoryReserved.v1', {
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        sagaId: context.sagaId
      });
    }
  }

  async compensate(context: SagaContext<OrderData>): Promise<void> {
    const { orderId, items } = context.data;
    
    for (const item of items) {
      await eventBus.publish('InventoryReleased.v1', {
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        sagaId: context.sagaId
      });
    }
  }
}

class PaymentVerificationStep extends SagaStep {
  async execute(context: SagaContext<OrderData>): Promise<void> {
    const { orderId, paymentMethod } = context.data;
    
    await eventBus.publish('PaymentVerified.v1', {
      orderId,
      paymentMethod,
      verifiedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<OrderData>): Promise<void> {
    await eventBus.publish('PaymentRefunded.v1', {
      orderId: context.data.orderId,
      sagaId: context.sagaId
    });
  }
}

class FulfillmentStep extends SagaStep {
  async execute(context: SagaContext<OrderData>): Promise<void> {
    const { orderId } = context.data;
    
    await eventBus.publish('OrderFulfillmentStarted.v1', {
      orderId,
      startedAt: new Date(),
      sagaId: context.sagaId
    });

    await eventBus.publish('OrderFulfilled.v1', {
      orderId,
      fulfilledAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<OrderData>): Promise<void> {
    await eventBus.publish('OrderFulfillmentCancelled.v1', {
      orderId: context.data.orderId,
      sagaId: context.sagaId
    });
  }
}

class ShippingStep extends SagaStep {
  async execute(context: SagaContext<OrderData>): Promise<void> {
    const { orderId } = context.data;
    
    await eventBus.publish('ShippingLabelGenerated.v1', {
      orderId,
      trackingNumber: `TRK${Date.now()}`,
      sagaId: context.sagaId
    });

    await eventBus.publish('OrderShipped.v1', {
      orderId,
      shippedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<OrderData>): Promise<void> {
    await eventBus.publish('ShippingCancelled.v1', {
      orderId: context.data.orderId,
      sagaId: context.sagaId
    });
  }
}

// Shipping & Fulfillment Saga
export class ShippingFulfillmentSaga extends Saga {
  constructor() {
    super('ShippingFulfillment');
  }

  async execute(context: SagaContext<{ orderId: string; shippingMethod: string; address: any }>): Promise<void> {
    await this.addStep(new ShippingRequestStep());
    await this.addStep(new CarrierSelectionStep());
    await this.addStep(new LabelGenerationStep());
    await this.addStep(new TrackingSetupStep());
    await this.addStep(new DeliveryMonitoringStep());
  }
}

class ShippingRequestStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { orderId, shippingMethod } = context.data;
    
    await eventBus.publish('ShippingRequested.v1', {
      orderId,
      shippingMethod,
      requestedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('ShippingRequestCancelled.v1', {
      orderId: context.data.orderId,
      sagaId: context.sagaId
    });
  }
}

class CarrierSelectionStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { orderId, shippingMethod } = context.data;
    
    const carrier = shippingMethod === 'express' ? 'FedEx' : 'UPS';
    
    await eventBus.publish('CarrierSelected.v1', {
      orderId,
      carrier,
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('CarrierSelectionCancelled.v1', {
      orderId: context.data.orderId,
      sagaId: context.sagaId
    });
  }
}

class LabelGenerationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { orderId } = context.data;
    
    await eventBus.publish('ShippingLabelGenerated.v1', {
      orderId,
      labelUrl: `https://labels.example.com/${orderId}.pdf`,
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('ShippingLabelCancelled.v1', {
      orderId: context.data.orderId,
      sagaId: context.sagaId
    });
  }
}

class TrackingSetupStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { orderId } = context.data;
    
    await eventBus.publish('TrackingSetup.v1', {
      orderId,
      trackingNumber: `TRK${Date.now()}`,
      trackingUrl: `https://tracking.example.com/TRK${Date.now()}`,
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('TrackingCancelled.v1', {
      orderId: context.data.orderId,
      sagaId: context.sagaId
    });
  }
}

class DeliveryMonitoringStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { orderId } = context.data;
    
    await eventBus.publish('DeliveryMonitoringStarted.v1', {
      orderId,
      monitoringStarted: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('DeliveryMonitoringStopped.v1', {
      orderId: context.data.orderId,
      sagaId: context.sagaId
    });
  }
}

// Return Processing Saga
export class ReturnProcessingSaga extends Saga {
  constructor() {
    super('ReturnProcessing');
  }

  async execute(context: SagaContext<{ returnId: string; orderId: string; reason: string; items: any[] }>): Promise<void> {
    await this.addStep(new ReturnRequestStep());
    await this.addStep(new ReturnApprovalStep());
    await this.addStep(new ReturnShippingStep());
    await this.addStep(new RefundProcessingStep());
  }
}

class ReturnRequestStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { returnId, orderId, reason } = context.data;
    
    await eventBus.publish('ReturnRequested.v1', {
      returnId,
      orderId,
      reason,
      requestedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('ReturnRequestCancelled.v1', {
      returnId: context.data.returnId,
      sagaId: context.sagaId
    });
  }
}

class ReturnApprovalStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { returnId } = context.data;
    
    await eventBus.publish('ReturnApproved.v1', {
      returnId,
      approvedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('ReturnApprovalRevoked.v1', {
      returnId: context.data.returnId,
      sagaId: context.sagaId
    });
  }
}

class ReturnShippingStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { returnId } = context.data;
    
    await eventBus.publish('ReturnShippingLabelGenerated.v1', {
      returnId,
      returnTrackingNumber: `RTN${Date.now()}`,
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('ReturnShippingCancelled.v1', {
      returnId: context.data.returnId,
      sagaId: context.sagaId
    });
  }
}

class RefundProcessingStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { returnId, orderId } = context.data;
    
    await eventBus.publish('RefundProcessed.v1', {
      returnId,
      orderId,
      refundAmount: 150.00,
      processedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('RefundReversed.v1', {
      returnId: context.data.returnId,
      sagaId: context.sagaId
    });
  }
}