/**
 * Example usage of the Redis EventBus and Distributed Scheduler
 * This file demonstrates professional integration patterns
 */

import { getEventBus, closeEventBus } from '../events/redisEventBus';
import { getScheduler, closeScheduler } from '../scheduler/distributedScheduler';

// Example event types (following event sourcing patterns)
enum EventTypes {
  ORDER_CREATED = 'OrderCreated.v1',
  PAYMENT_PROCESSED = 'PaymentProcessed.v1',
  INVENTORY_UPDATED = 'InventoryUpdated.v1',
  COMPLIANCE_CHECK_COMPLETED = 'ComplianceCheckCompleted.v1',
  NOTIFICATION_SENT = 'NotificationSent.v1'
}

// Example event handlers
class ExampleEventHandlers {
  private eventBus = getEventBus();

  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handle order creation events
    this.eventBus.subscribe(EventTypes.ORDER_CREATED, async (event) => {
      console.log(`📦 Processing order: ${event.payload.orderId}`);

      try {
        // Process inventory reservation
        await this.reserveInventory(event.payload);

        // Process payment
        await this.processPayment(event.payload);

        // Send confirmation notification
        await this.sendOrderConfirmation(event.payload);

        console.log(`✅ Order ${event.payload.orderId} processed successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to process order ${event.payload.orderId}:`, error);

        // Publish failure event
        await this.eventBus.publish(EventTypes.ORDER_CREATED, {
          ...event.payload,
          status: 'failed',
          error: errorMessage,
          retryCount: (event.metadata?.retryCount || 0) + 1
        }, {
          correlationId: event.metadata?.correlationId,
          retryCount: (event.metadata?.retryCount || 0) + 1
        });
      }
    });

    // Handle payment processing events
    this.eventBus.subscribe(EventTypes.PAYMENT_PROCESSED, async (event) => {
      console.log(`💳 Payment processed for order: ${event.payload.orderId}`);

      // Update order status
      await this.updateOrderStatus(event.payload.orderId, 'paid');

      // Trigger shipping process
      await this.eventBus.publish(EventTypes.ORDER_CREATED, {
        orderId: event.payload.orderId,
        action: 'initiate_shipping'
      }, {
        correlationId: event.metadata?.correlationId
      });
    });

    // Handle inventory updates
    this.eventBus.subscribe(EventTypes.INVENTORY_UPDATED, async (event) => {
      console.log(`📦 Inventory updated: ${event.payload.productId}`);

      // Check if we need to reorder
      if (event.payload.quantity < event.payload.reorderPoint) {
        await this.createReorderRequest(event.payload);
      }
    });

    console.log('🎧 Event handlers registered');
  }

  private async reserveInventory(orderData: any): Promise<void> {
    // Simulate inventory reservation logic
    console.log(`🔄 Reserving inventory for ${orderData.items.length} items`);

    // Publish inventory update event
    await this.eventBus.publish(EventTypes.INVENTORY_UPDATED, {
      productId: orderData.items[0].productId, // Simplified
      quantity: 95, // Mock remaining quantity
      reorderPoint: 10
    });
  }

  private async processPayment(orderData: any): Promise<void> {
    // Simulate payment processing
    console.log(`💳 Processing payment of $${orderData.totalAmount}`);

    // Publish payment processed event
    await this.eventBus.publish(EventTypes.PAYMENT_PROCESSED, {
      orderId: orderData.orderId,
      amount: orderData.totalAmount,
      paymentMethod: orderData.paymentMethod,
      transactionId: `txn_${Date.now()}`
    });
  }

  private async sendOrderConfirmation(orderData: any): Promise<void> {
    console.log(`📧 Sending order confirmation to ${orderData.customerEmail}`);

    // Publish notification event
    await this.eventBus.publish(EventTypes.NOTIFICATION_SENT, {
      type: 'order_confirmation',
      recipient: orderData.customerEmail,
      orderId: orderData.orderId,
      subject: `Order Confirmation - ${orderData.orderId}`
    });
  }

  private async updateOrderStatus(orderId: string, status: string): Promise<void> {
    console.log(`📝 Updating order ${orderId} status to ${status}`);
    // Database update logic would go here
  }

  private async createReorderRequest(inventoryData: any): Promise<void> {
    console.log(`🔄 Creating reorder request for ${inventoryData.productId}`);
    // Reorder logic would go here
  }
}

// Example scheduled jobs
class ExampleScheduledJobs {
  private scheduler = getScheduler();

  constructor() {
    this.setupScheduledJobs();
  }

  private setupScheduledJobs(): void {
    // Daily compliance checks (24 hours)
    this.scheduler.addJob({
      name: 'daily-compliance-check',
      interval: 24 * 60 * 60 * 1000, // 24 hours
      job: async () => {
        console.log('🔍 Running daily compliance checks...');

        try {
          await this.runComplianceChecks();

          // Publish compliance completion event
          await getEventBus().publish(EventTypes.COMPLIANCE_CHECK_COMPLETED, {
            checkType: 'daily',
            timestamp: new Date().toISOString(),
            results: {
              gdprCompliant: true,
              pciCompliant: true,
              soxCompliant: true
            }
          });

          console.log('✅ Daily compliance checks completed');
        } catch (error) {
          console.error('❌ Daily compliance checks failed:', error);
          throw error; // Let scheduler handle retry
        }
      },
      enabled: true
    });

    // Hourly inventory reconciliation (1 hour)
    this.scheduler.addJob({
      name: 'hourly-inventory-reconciliation',
      interval: 60 * 60 * 1000, // 1 hour
      job: async () => {
        console.log('🔄 Running inventory reconciliation...');

        try {
          const discrepancies = await this.reconcileInventory();

          if (discrepancies.length > 0) {
            console.warn(`⚠️ Found ${discrepancies.length} inventory discrepancies`);

            // Publish alert event
            await getEventBus().publish('InventoryDiscrepancyDetected.v1', {
              discrepancies,
              timestamp: new Date().toISOString()
            });
          }

          console.log('✅ Inventory reconciliation completed');
        } catch (error) {
          console.error('❌ Inventory reconciliation failed:', error);
          throw error;
        }
      },
      enabled: true
    });

    // Weekly system health check (7 days)
    this.scheduler.addJob({
      name: 'weekly-system-health-check',
      interval: 7 * 24 * 60 * 60 * 1000, // 7 days
      job: async () => {
        console.log('🏥 Running weekly system health check...');

        try {
          const healthReport = await this.performSystemHealthCheck();

          // Publish health report event
          await getEventBus().publish('SystemHealthCheckCompleted.v1', {
            report: healthReport,
            timestamp: new Date().toISOString()
          });

          console.log('✅ Weekly system health check completed');
        } catch (error) {
          console.error('❌ Weekly system health check failed:', error);
          throw error;
        }
      },
      enabled: true
    });

    console.log('📅 Scheduled jobs configured');
  }

  private async runComplianceChecks(): Promise<void> {
    // Simulate compliance checks
    console.log('🔍 Checking GDPR compliance...');
    await this.delay(500);

    console.log('🔍 Checking PCI compliance...');
    await this.delay(500);

    console.log('🔍 Checking SOX compliance...');
    await this.delay(500);
  }

  private async reconcileInventory(): Promise<any[]> {
    // Simulate inventory reconciliation
    console.log('🔄 Reconciling inventory levels...');
    await this.delay(200);

    // Mock discrepancies (usually empty in real scenario)
    return Math.random() < 0.1 ? [{
      productId: 'PROD-001',
      expected: 100,
      actual: 95,
      difference: -5
    }] : [];
  }

  private async performSystemHealthCheck(): Promise<any> {
    // Simulate system health checks
    console.log('🏥 Checking database connectivity...');
    await this.delay(300);

    console.log('🏥 Checking Redis connectivity...');
    await this.delay(300);

    console.log('🏥 Checking service dependencies...');
    await this.delay(300);

    return {
      database: { status: 'healthy', latency: 45 },
      redis: { status: 'healthy', latency: 12 },
      services: { status: 'healthy', activeServices: 8 },
      overall: 'healthy'
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main application example
class ExampleApplication {
  private eventHandlers: ExampleEventHandlers;
  private scheduledJobs: ExampleScheduledJobs;

  constructor() {
    console.log('🚀 Starting Example Application...');

    // Initialize event handlers
    this.eventHandlers = new ExampleEventHandlers();

    // Initialize scheduled jobs
    this.scheduledJobs = new ExampleScheduledJobs();
  }

  async start(): Promise<void> {
    console.log('✅ Example Application started successfully');
    console.log('🎧 Listening for events...');
    console.log('📅 Scheduled jobs are running...');

    // Example: Publish a test order event
    setTimeout(async () => {
      console.log('\n🧪 Publishing test order event...');
      await getEventBus().publish(EventTypes.ORDER_CREATED, {
        orderId: 'ORD-TEST-001',
        customerEmail: 'customer@example.com',
        customerId: 'CUST-001',
        items: [
          { productId: 'PROD-001', quantity: 2, price: 29.99 },
          { productId: 'PROD-002', quantity: 1, price: 49.99 }
        ],
        totalAmount: 109.97,
        paymentMethod: 'credit_card'
      }, {
        correlationId: 'test-session-123',
        userId: 'CUST-001'
      });
    }, 3000); // Wait 3 seconds to ensure everything is set up
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping Example Application...');

    // Close scheduler
    await closeScheduler();

    // Close event bus
    await closeEventBus();

    console.log('✅ Example Application stopped');
  }

  // Utility methods for monitoring
  getEventBusStatus() {
    const eventBus = getEventBus();
    return {
      isHealthy: eventBus.isHealthy(),
      subscriberCount: eventBus.getSubscriberCount(EventTypes.ORDER_CREATED),
      subscribedEvents: eventBus.getSubscribedEvents()
    };
  }

  getSchedulerStatus() {
    const scheduler = getScheduler();
    return scheduler.getStatus();
  }

  getJobStats(jobName?: string) {
    const scheduler = getScheduler();
    return scheduler.getJobStats(jobName);
  }
}

// Export for use in other files
export { ExampleApplication, EventTypes };

// For direct execution
if (require.main === module) {
  const app = new ExampleApplication();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  // Start the application
  app.start().catch((error) => {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  });

  // Monitor status every 30 seconds
  setInterval(() => {
    const eventBusStatus = app.getEventBusStatus();
    const schedulerStatus = app.getSchedulerStatus();

    console.log('\n📊 System Status:');
    console.log(`EventBus: ${eventBusStatus.isHealthy ? '✅' : '❌'} (${eventBusStatus.subscribedEvents.length} events)`);
    console.log(`Scheduler: ${schedulerStatus.isLeader ? '👑' : '👤'} (${schedulerStatus.jobs.length} jobs)`);
  }, 30000);
}
