// Event Flow Testing for Order Service
// Comprehensive integration tests for end-to-end event flows

import { PrismaClient } from '@prisma/client';
import { EventBus } from '../src/shared/events/eventBus';
import { OrderService } from '../src/orderService';
import {
  OrderCreatedEvent,
  OrderPaidEvent,
  OrderShippedEvent,
  OrderDeliveredEvent,
  OrderCancelledEvent
} from '../src/events/orderEvents';

// Mock services for testing
class MockInventoryService {
  private reservations: Map<string, any> = new Map();

  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    console.log(`📦 Inventory: Processing OrderCreated for ${event.payload.orderId}`);

    // Simulate stock reservation
    for (const item of event.payload.items) {
      const reservationKey = `${event.payload.orderId}-${item.productVariantId}`;
      this.reservations.set(reservationKey, {
        orderId: event.payload.orderId,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        status: 'reserved'
      });
    }
  }

  async handleOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    console.log(`📦 Inventory: Processing OrderCancelled for ${event.payload.orderId}`);

    // Release reservations
    for (const [key, reservation] of this.reservations.entries()) {
      if (reservation.orderId === event.payload.orderId) {
        reservation.status = 'released';
      }
    }
  }

  getReservations(orderId: string) {
    return Array.from(this.reservations.values()).filter(r => r.orderId === orderId);
  }
}

class MockPaymentService {
  private payments: Map<string, any> = new Map();
  public eventBus!: EventBus;

  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    console.log(`💳 Payment: Processing OrderCreated for ${event.payload.orderId}`);

    // Simulate payment processing
    const paymentId = `payment-${Date.now()}`;
    this.payments.set(event.payload.orderId, {
      paymentId,
      orderId: event.payload.orderId,
      amount: event.payload.totalAmount,
      status: 'completed'
    });

    // Publish OrderPaid event
    const orderPaidEvent: OrderPaidEvent = {
      eventId: `event-${Date.now()}`,
      eventType: 'OrderPaid.v1',
      eventVersion: 1,
      producer: 'payment-service',
      timestamp: new Date().toISOString(),
      entityType: 'order',
      entityId: event.payload.orderId,
      userId: event.userId,
      payload: {
        orderId: event.payload.orderId,
        paymentId,
        amount: event.payload.totalAmount,
        currency: event.payload.currency,
        paymentMethod: 'card',
        transactionId: `txn-${Date.now()}`
      }
    };

    await this.eventBus.publish(orderPaidEvent);
  }

  setEventBus(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  getPayment(orderId: string) {
    return this.payments.get(orderId);
  }
}

class MockLogisticsService {
  private shipments: Map<string, any> = new Map();
  public eventBus!: EventBus;

  async handleOrderPaid(event: OrderPaidEvent): Promise<void> {
    console.log(`🚚 Logistics: Processing OrderPaid for ${event.payload.orderId}`);

    // Create shipment
    const shipmentId = `shipment-${Date.now()}`;
    const trackingNumber = `TN${Date.now()}`;

    this.shipments.set(event.payload.orderId, {
      shipmentId,
      trackingNumber,
      orderId: event.payload.orderId,
      status: 'shipped',
      carrier: 'Test Carrier',
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    });

    // Publish OrderShipped event
    const orderShippedEvent: OrderShippedEvent = {
      eventId: `event-${Date.now()}`,
      eventType: 'OrderShipped.v1',
      eventVersion: 1,
      producer: 'logistics-service',
      timestamp: new Date().toISOString(),
      entityType: 'order',
      entityId: event.payload.orderId,
      userId: event.userId,
      payload: {
        orderId: event.payload.orderId,
        shipmentId,
        trackingNumber,
        carrier: 'Test Carrier',
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        items: [] // Simplified for testing
      }
    };

    await this.eventBus.publish(orderShippedEvent);

    // Simulate delivery after delay
    setTimeout(async () => {
      await this.deliverOrder(event.payload.orderId);
    }, 100); // Quick delivery for testing
  }

  async deliverOrder(orderId: string): Promise<void> {
    const shipment = this.shipments.get(orderId);
    if (!shipment) return;

    shipment.status = 'delivered';
    shipment.actualDelivery = new Date().toISOString();

    // Publish OrderDelivered event
    const orderDeliveredEvent: OrderDeliveredEvent = {
      eventId: `event-${Date.now()}`,
      eventType: 'OrderDelivered.v1',
      eventVersion: 1,
      producer: 'logistics-service',
      timestamp: new Date().toISOString(),
      entityType: 'order',
      entityId: orderId,
      userId: 'test-user-id',
      payload: {
        orderId,
        shipmentId: shipment.shipmentId,
        deliveryTimestamp: shipment.actualDelivery,
        recipientName: 'Test Recipient',
        deliveryLocation: { lat: -6.8, lng: 39.3 }
      }
    };

    await this.eventBus.publish(orderDeliveredEvent);
  }

  setEventBus(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  getShipment(orderId: string) {
    return this.shipments.get(orderId);
  }
}

describe('Event Flow Testing - Complete Order Lifecycle', () => {
  let prisma: PrismaClient;
  let eventBus: EventBus;
  let orderService: OrderService;
  let inventoryService: MockInventoryService;
  let paymentService: MockPaymentService;
  let logisticsService: MockLogisticsService;

  beforeAll(async () => {
    // Initialize test database (in-memory SQLite for testing)
    prisma = new PrismaClient();
    eventBus = new EventBus();

    // Initialize services
    orderService = new OrderService(prisma, eventBus);
    inventoryService = new MockInventoryService();
    paymentService = new MockPaymentService();
    logisticsService = new MockLogisticsService();

    // Set event bus references
    paymentService.setEventBus(eventBus);
    logisticsService.setEventBus(eventBus);

    // Register event handlers
    eventBus.onEvent('OrderCreated.v1', (event) => inventoryService.handleOrderCreated(event as OrderCreatedEvent));
    eventBus.onEvent('OrderCreated.v1', (event) => paymentService.handleOrderCreated(event as OrderCreatedEvent));
    eventBus.onEvent('OrderPaid.v1', (event) => logisticsService.handleOrderPaid(event as OrderPaidEvent));
    eventBus.onEvent('OrderCancelled.v1', (event) => inventoryService.handleOrderCancelled(event as OrderCancelledEvent));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Happy Path: Complete Order Flow', () => {
    let orderId: string;
    let orderNumber: string;

    test('Step 1: Create Order → Triggers Inventory & Payment Processing', async () => {
      const orderData = {
        buyerId: 'buyer-123',
        sellerId: 'seller-456',
        items: [
          {
            productId: 'product-1',
            price: 100,
            quantity: 2
          },
          {
            productId: 'product-2',
            price: 50,
            quantity: 1
          }
        ],
        shippingAddress: {
          street: 'Test Street 123',
          city: 'Dar es Salaam',
          country: 'Tanzania'
        }
      };

      const result = await orderService.createOrder(orderData);
      orderId = result.orderId;
      orderNumber = result.orderNumber;

      expect(orderId).toBeDefined();
      expect(orderNumber).toMatch(/^ORD-/);

      // Wait for async event processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify inventory reservation
      const reservations = inventoryService.getReservations(orderId);
      expect(reservations).toHaveLength(2);
      expect(reservations.every(r => r.status === 'reserved')).toBe(true);

      // Verify payment processing
      const payment = paymentService.getPayment(orderId);
      expect(payment).toBeDefined();
      expect(payment.amount).toBe(250); // 2*100 + 1*50
    });

    test('Step 2: Payment Processing → Triggers Shipping', async () => {
      // Wait for shipping to be triggered
      await new Promise(resolve => setTimeout(resolve, 300));

      const shipment = logisticsService.getShipment(orderId);
      expect(shipment).toBeDefined();
      expect(shipment.status).toBe('shipped');
      expect(shipment.trackingNumber).toMatch(/^TN/);
    });

    test('Step 3: Shipping → Triggers Delivery', async () => {
      // Wait for delivery to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      const shipment = logisticsService.getShipment(orderId);
      expect(shipment.status).toBe('delivered');
      expect(shipment.actualDelivery).toBeDefined();
    });

    test('Step 4: Verify Complete Order State', async () => {
      const order = await orderService.getOrder(orderId);
      expect(order).toBeDefined();
      expect(order?.status).toBe('delivered');

      // Verify all items are delivered
      expect(order?.items.every(item => item.status === 'delivered')).toBe(true);
    });
  });

  describe('Error Path: Order Cancellation Flow', () => {
    let cancelledOrderId: string;

    test('Cancel Order → Triggers Stock Release', async () => {
      // Create another order for cancellation testing
      const orderData = {
        buyerId: 'buyer-789',
        sellerId: 'seller-012',
        items: [{
          productId: 'product-3',
          price: 75,
          quantity: 1
        }],
        shippingAddress: {
          street: 'Cancel Test Street',
          city: 'Dar es Salaam',
          country: 'Tanzania'
        }
      };

      const result = await orderService.createOrder(orderData);
      cancelledOrderId = result.orderId;

      // Wait for initial processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Cancel the order
      await orderService.cancelOrder(cancelledOrderId, {
        reason: 'Customer request',
        cancelledBy: 'buyer-789',
        refundAmount: 75
      });

      // Wait for cancellation processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify stock was released
      const reservations = inventoryService.getReservations(cancelledOrderId);
      expect(reservations.every(r => r.status === 'released')).toBe(true);

      // Verify order status
      const order = await orderService.getOrder(cancelledOrderId);
      expect(order?.status).toBe('cancelled');
    });
  });

  describe('Load Testing: Concurrent Order Processing', () => {
    test('Process Multiple Orders Concurrently', async () => {
      const orderPromises = Array.from({ length: 5 }, async (_, index) => {
        const orderData = {
          buyerId: `buyer-concurrent-${index}`,
          sellerId: `seller-concurrent-${index}`,
          items: [{
            productId: `product-concurrent-${index}`,
            price: 100 + index * 10,
            quantity: 1
          }],
          shippingAddress: {
            street: `Concurrent Street ${index}`,
            city: 'Dar es Salaam',
            country: 'Tanzania'
          }
        };

        return await orderService.createOrder(orderData);
      });

      const results = await Promise.all(orderPromises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.orderId).toBeDefined();
        expect(result.orderNumber).toMatch(/^ORD-/);
      });

      // Wait for all async processing to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify all orders were processed
      for (const result of results) {
        const order = await orderService.getOrder(result.orderId);
        expect(order?.status).toBe('delivered');

        const reservations = inventoryService.getReservations(result.orderId);
        expect(reservations).toHaveLength(1);
        expect(reservations[0].status).toBe('reserved');
      }
    });
  });

  describe('Chaos Engineering: Event Failure Simulation', () => {
    test('Event Handler Failure → System Continues', async () => {
      // Register a failing handler
      eventBus.onEvent('OrderCreated.v1', async () => {
        throw new Error('Simulated handler failure');
      });

      const orderData = {
        buyerId: 'buyer-chaos',
        sellerId: 'seller-chaos',
        items: [{
          productId: 'product-chaos',
          price: 200,
          quantity: 1
        }],
        shippingAddress: {
          street: 'Chaos Test Street',
          city: 'Dar es Salaam',
          country: 'Tanzania'
        }
      };

      // Order creation should still succeed despite handler failure
      const result = await orderService.createOrder(orderData);

      expect(result.orderId).toBeDefined();
      expect(result.orderNumber).toMatch(/^ORD-/);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify other handlers still processed successfully
      const reservations = inventoryService.getReservations(result.orderId);
      expect(reservations).toHaveLength(1);
    });
  });

  describe('Performance Benchmarking', () => {
    test('Event Processing Latency', async () => {
      const startTime = Date.now();

      const orderData = {
        buyerId: 'buyer-perf',
        sellerId: 'seller-perf',
        items: [{
          productId: 'product-perf',
          price: 150,
          quantity: 1
        }],
        shippingAddress: {
          street: 'Performance Test Street',
          city: 'Dar es Salaam',
          country: 'Tanzania'
        }
      };

      await orderService.createOrder(orderData);

      // Wait for complete processing
      await new Promise(resolve => setTimeout(resolve, 500));

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Assert performance SLA (< 5 seconds end-to-end)
      expect(totalTime).toBeLessThan(5000);

      console.log(`📊 Event flow completed in ${totalTime}ms`);
    });
  });
});
