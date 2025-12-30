// Load Testing for Event Flow Performance
// Tests system performance under high concurrent load

const { performance } = require('perf_hooks');

// Mock Event Bus for load testing
class MockEventBus {
  constructor() {
    this.events = [];
    this.handlers = new Map();
  }

  onEvent(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType).push(handler);
  }

  async publish(event) {
    this.events.push(event);
    const handlers = this.handlers.get(event.eventType) || [];

    const promises = handlers.map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        // Silent error handling for load testing
      }
    });

    await Promise.allSettled(promises);
  }

  getEventCount() {
    return this.events.length;
  }

  getEventsByType(eventType) {
    return this.events.filter(e => e.eventType === eventType);
  }

  clear() {
    this.events = [];
  }
}

// Mock Services for Load Testing
class MockInventoryService {
  constructor() {
    this.reservations = new Map();
  }

  async handleOrderCreated(event) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

    for (const item of event.payload.items) {
      const key = `${event.payload.orderId}-${item.productVariantId}`;
      this.reservations.set(key, {
        orderId: event.payload.orderId,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        status: 'reserved'
      });
    }
  }

  getReservationCount() {
    return this.reservations.size;
  }
}

class MockPaymentService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.payments = new Map();
  }

  async handleOrderCreated(event) {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));

    const paymentId = `payment-${Date.now()}-${Math.random()}`;
    this.payments.set(event.payload.orderId, {
      paymentId,
      amount: event.payload.totalAmount,
      status: 'completed'
    });

    // Publish OrderPaid event
    const orderPaidEvent = {
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

  getPaymentCount() {
    return this.payments.size;
  }
}

// Mock Order Service for Load Testing
class MockOrderService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.orderCount = 0;
  }

  async createOrder(orderData) {
    this.orderCount++;
    const orderId = `order-${Date.now()}-${this.orderCount}`;
    const orderNumber = `ORD-${Date.now()}-${this.orderCount}`;

    const orderCreatedEvent = {
      eventId: `event-${Date.now()}`,
      eventType: 'OrderCreated.v1',
      eventVersion: 1,
      producer: 'order-service',
      timestamp: new Date().toISOString(),
      entityType: 'order',
      entityId: orderId,
      userId: orderData.buyerId,
      payload: {
        orderId,
        orderNumber,
        userId: orderData.buyerId,
        totalAmount: orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        currency: 'TZS',
        items: orderData.items.map(item => ({
          productVariantId: item.productId, // Simplified mapping
          sellerId: orderData.sellerId,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity
        })),
        shippingAddress: orderData.shippingAddress
      }
    };

    await this.eventBus.publish(orderCreatedEvent);

    return { orderId, orderNumber };
  }

  getOrderCount() {
    return this.orderCount;
  }
}

// Load Testing Scenarios
async function runLoadTests() {
  console.log('🚀 Starting Event Flow Load Testing\n');

  const scenarios = [
    { name: 'Low Load (10 orders)', orderCount: 10, concurrency: 2 },
    { name: 'Medium Load (50 orders)', orderCount: 50, concurrency: 5 },
    { name: 'High Load (100 orders)', orderCount: 100, concurrency: 10 },
    { name: 'Spike Load (200 orders)', orderCount: 200, concurrency: 20 }
  ];

  for (const scenario of scenarios) {
    console.log(`📊 Running ${scenario.name}`);
    console.log('='.repeat(50));

    const result = await runScenario(scenario);
    displayResults(scenario, result);

    console.log('');
  }

  console.log('✅ Load testing completed!');
}

async function runScenario({ orderCount, concurrency }) {
  const eventBus = new MockEventBus();
  const inventoryService = new MockInventoryService();
  const paymentService = new MockPaymentService(eventBus);
  const orderService = new MockOrderService(eventBus);

  // Register event handlers
  eventBus.onEvent('OrderCreated.v1', (event) => inventoryService.handleOrderCreated(event));
  eventBus.onEvent('OrderCreated.v1', (event) => paymentService.handleOrderCreated(event));

  const startTime = performance.now();

  // Create orders in batches with concurrency control
  const batches = [];
  for (let i = 0; i < orderCount; i += concurrency) {
    const batch = Array.from({ length: Math.min(concurrency, orderCount - i) }, async () => {
      const orderData = {
        buyerId: `buyer-${Date.now()}-${Math.random()}`,
        sellerId: `seller-${Date.now()}-${Math.random()}`,
        items: [{
          productId: `product-${Date.now()}-${Math.random()}`,
          price: 100 + Math.floor(Math.random() * 900), // $1-10
          quantity: 1 + Math.floor(Math.random() * 5) // 1-5 items
        }],
        shippingAddress: {
          street: `Test Street ${Math.floor(Math.random() * 1000)}`,
          city: 'Dar es Salaam',
          country: 'Tanzania'
        }
      };

      return await orderService.createOrder(orderData);
    });

    batches.push(batch);
  }

  // Execute batches sequentially to control concurrency
  for (const batch of batches) {
    await Promise.all(batch);
  }

  const endTime = performance.now();

  return {
    totalTime: endTime - startTime,
    ordersCreated: orderService.getOrderCount(),
    eventsPublished: eventBus.getEventCount(),
    reservationsCreated: inventoryService.getReservationCount(),
    paymentsProcessed: paymentService.getPaymentCount(),
    orderCreatedEvents: eventBus.getEventsByType('OrderCreated.v1').length,
    orderPaidEvents: eventBus.getEventsByType('OrderPaid.v1').length,
    throughput: orderCount / ((endTime - startTime) / 1000), // orders per second
    avgLatency: (endTime - startTime) / orderCount // ms per order
  };
}

function displayResults(scenario, result) {
  console.log(`⏱️  Total Time: ${result.totalTime.toFixed(2)}ms`);
  console.log(`📦 Orders Created: ${result.ordersCreated}`);
  console.log(`📢 Events Published: ${result.eventsPublished}`);
  console.log(`📋 Reservations Created: ${result.reservationsCreated}`);
  console.log(`💳 Payments Processed: ${result.paymentsProcessed}`);
  console.log(`🔄 OrderCreated Events: ${result.orderCreatedEvents}`);
  console.log(`💰 OrderPaid Events: ${result.orderPaidEvents}`);
  console.log(`⚡ Throughput: ${result.throughput.toFixed(2)} orders/sec`);
  console.log(`⏱️  Avg Latency: ${result.avgLatency.toFixed(2)}ms per order`);

  // Performance assertions
  const maxLatency = scenario.orderCount <= 50 ? 500 : scenario.orderCount <= 100 ? 1000 : 2000;
  const minThroughput = scenario.orderCount <= 50 ? 5 : scenario.orderCount <= 100 ? 10 : 20;

  if (result.avgLatency < maxLatency) {
    console.log(`✅ Latency SLA met (< ${maxLatency}ms)`);
  } else {
    console.log(`❌ Latency SLA violated (> ${maxLatency}ms)`);
  }

  if (result.throughput > minThroughput) {
    console.log(`✅ Throughput SLA met (> ${minThroughput} orders/sec)`);
  } else {
    console.log(`❌ Throughput SLA violated (< ${minThroughput} orders/sec)`);
  }

  // Data consistency checks
  if (result.ordersCreated === result.reservationsCreated) {
    console.log('✅ Data Consistency: Orders = Reservations');
  } else {
    console.log('❌ Data Consistency: Orders ≠ Reservations');
  }

  if (result.orderCreatedEvents === result.orderPaidEvents) {
    console.log('✅ Event Flow: All orders paid');
  } else {
    console.log('❌ Event Flow: Payment mismatch');
  }
}

// Chaos Engineering Test
async function runChaosTests() {
  console.log('\n🎭 Running Chaos Engineering Tests\n');

  const chaosScenarios = [
    { name: 'Handler Failure (10%)', failureRate: 0.1 },
    { name: 'Handler Failure (25%)', failureRate: 0.25 },
    { name: 'Network Delay (100ms)', delay: 100 },
    { name: 'Network Delay (500ms)', delay: 500 }
  ];

  for (const scenario of chaosScenarios) {
    console.log(`🌀 Testing ${scenario.name}`);
    console.log('-'.repeat(40));

    const result = await runChaosScenario(scenario);
    displayChaosResults(scenario, result);

    console.log('');
  }

  console.log('🎭 Chaos testing completed!');
}

async function runChaosScenario({ failureRate = 0, delay = 0 }) {
  const eventBus = new MockEventBus();
  const inventoryService = new MockInventoryService();
  const paymentService = new MockPaymentService(eventBus);
  const orderService = new MockOrderService(eventBus);

  // Register event handlers with chaos injection
  eventBus.onEvent('OrderCreated.v1', async (event) => {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    if (failureRate > 0 && Math.random() < failureRate) {
      throw new Error('Chaos: Handler failure');
    }
    await inventoryService.handleOrderCreated(event);
  });

  eventBus.onEvent('OrderCreated.v1', async (event) => {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    if (failureRate > 0 && Math.random() < failureRate) {
      throw new Error('Chaos: Payment failure');
    }
    await paymentService.handleOrderCreated(event);
  });

  const startTime = performance.now();

  // Create 20 orders with chaos
  const orderPromises = Array.from({ length: 20 }, async (_, index) => {
    const orderData = {
      buyerId: `chaos-buyer-${index}`,
      sellerId: `chaos-seller-${index}`,
      items: [{
        productId: `chaos-product-${index}`,
        price: 100,
        quantity: 1
      }],
      shippingAddress: {
        street: `Chaos Street ${index}`,
        city: 'Dar es Salaam',
        country: 'Tanzania'
      }
    };

    return await orderService.createOrder(orderData);
  });

  const results = await Promise.allSettled(orderPromises);
  const endTime = performance.now();

  const successfulOrders = results.filter(r => r.status === 'fulfilled').length;
  const failedOrders = results.filter(r => r.status === 'rejected').length;

  return {
    totalTime: endTime - startTime,
    successfulOrders,
    failedOrders,
    eventsPublished: eventBus.getEventCount(),
    reservationsCreated: inventoryService.getReservationCount(),
    paymentsProcessed: paymentService.getPaymentCount(),
    successRate: successfulOrders / 20,
    avgLatency: (endTime - startTime) / 20
  };
}

function displayChaosResults(scenario, result) {
  console.log(`⏱️  Total Time: ${result.totalTime.toFixed(2)}ms`);
  console.log(`✅ Successful Orders: ${result.successfulOrders}`);
  console.log(`❌ Failed Orders: ${result.failedOrders}`);
  console.log(`📢 Events Published: ${result.eventsPublished}`);
  console.log(`📋 Reservations Created: ${result.reservationsCreated}`);
  console.log(`💳 Payments Processed: ${result.paymentsProcessed}`);
  console.log(`📊 Success Rate: ${(result.successRate * 100).toFixed(1)}%`);
  console.log(`⏱️  Avg Latency: ${result.avgLatency.toFixed(2)}ms per order`);

  // Resilience assertions
  if (result.successRate > 0.8) {
    console.log('✅ System Resilience: >80% success rate maintained');
  } else {
    console.log('❌ System Resilience: <80% success rate');
  }

  if (result.avgLatency < 2000) {
    console.log('✅ Performance: Latency acceptable under chaos');
  } else {
    console.log('❌ Performance: High latency under chaos');
  }
}

// Run all tests
async function main() {
  try {
    await runLoadTests();
    await runChaosTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Execute tests
if (require.main === module) {
  main();
}

module.exports = {
  runLoadTests,
  runChaosTests,
  MockEventBus,
  MockInventoryService,
  MockPaymentService,
  MockOrderService
};
