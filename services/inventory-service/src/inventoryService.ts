import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from '../../../shared/outbox/outboxPattern';
import { EventEnvelope, InventoryReservedPayload, InventoryReleasedPayload, EventFactory } from '../../../events';
import { eventBus } from '@shared-events/eventBus';
import { randomUUID } from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyPayload = Record<string, any>;

interface LegacySagaEvent {
  data: LegacyPayload;
  payload: LegacyPayload;
  metadata?: Record<string, unknown>;
  sagaId?: string;
}

const asLegacyPayload = (value: unknown): LegacyPayload =>
  typeof value === 'object' && value !== null ? (value as LegacyPayload) : {};

const asLegacyEvent = (envelope: Record<string, unknown>): LegacySagaEvent => {
  const metadata = asLegacyPayload(envelope.metadata) as Record<string, unknown>;
  const sagaIdFromEnvelope = typeof envelope.sagaId === 'string' ? envelope.sagaId : undefined;
  const metadataSagaId = typeof metadata?.sagaId === 'string' ? metadata.sagaId : undefined;
  return {
    data: asLegacyPayload(envelope.data),
    payload: asLegacyPayload(envelope.payload),
    metadata,
    sagaId: sagaIdFromEnvelope || metadataSagaId
  };
};

const subscribeLegacy = (
  eventType: string,
  handler: (event: LegacySagaEvent) => Promise<void>
): void => {
  eventBus.subscribe(eventType, async (envelope) => {
    await handler(asLegacyEvent(envelope as unknown as Record<string, unknown>));
  });
};

export class InventoryService {
  private outbox: TransactionalOutbox;

  constructor(private prisma: PrismaClient) {
    this.outbox = new TransactionalOutbox(prisma);
    this.initializeEventHandlers();
    this.initializeSupplierEventHandlers();
    this.initializeSellerSagaHandlers();
  }

  private initializeEventHandlers(): void {
    // Legacy initialization hook kept for backwards compatibility.
  }

  private initializeSellerSagaHandlers() {
    // Inventory Management Saga Events
    subscribeLegacy('StockChecked', async (event) => {
      const { productId, stockLevel, reorderPoint } = event.data;
      
      if (stockLevel <= reorderPoint) {
        await eventBus.publish({
          eventType: 'ReorderCalculated',
          data: { productId, reorderQuantity: 200, estimatedCost: 5000 },
          metadata: { sagaId: event.sagaId }
        });
      }
    });

    subscribeLegacy('ReorderCalculated', async (event) => {
      const { productId, reorderQuantity } = event.data;
      
      await eventBus.publish({
        eventType: 'SupplierNotified',
        data: { productId, reorderQuantity, notifiedAt: new Date() },
        metadata: { sagaId: event.sagaId }
      });
    });

    subscribeLegacy('SupplierNotified', async (event) => {
      const { productId } = event.data;
      
      await eventBus.publish({
        eventType: 'InventoryUpdated',
        data: { productId, updatedAt: new Date() },
        metadata: { sagaId: event.sagaId }
      });
    });

    // Order Processing Saga Events
    subscribeLegacy('OrderReceived', async (event) => {
      const { orderId, items } = event.data;
      
      for (const item of items) {
        await eventBus.publish({
          eventType: 'InventoryReserved',
          data: { orderId, productId: item.productId, quantity: item.quantity },
          metadata: { sagaId: event.sagaId }
        });
      }
    });

    subscribeLegacy('PaymentFailed', async (event) => {
      const { orderId, items } = event.data;
      
      for (const item of items) {
        await eventBus.publish({
          eventType: 'InventoryReleased',
          data: { orderId, productId: item.productId, quantity: item.quantity },
          metadata: { sagaId: event.sagaId }
        });
      }
    });

    // Bulk Product Operations Saga Events
    subscribeLegacy('BulkOperationValidated', async (event) => {
      const { productIds, operation } = event.data;
      
      for (const productId of productIds) {
        await eventBus.publish({
          eventType: 'BulkProductOperationExecuted',
          data: { productId, operation },
          metadata: { sagaId: event.sagaId }
        });
      }
    });

    subscribeLegacy('BulkProductOperationExecuted', async (event) => {
      const { productIds } = event.data;
      
      await eventBus.publish({
        eventType: 'BulkOperationCompleted',
        data: { productCount: productIds?.length || 1 },
        metadata: { sagaId: event.sagaId }
      });
    });
  }

  private initializeSupplierEventHandlers() {
    // Production Planning Events
    subscribeLegacy('ProductionOrdersAnalyzed', async (event) => {
      const { supplierId, orders } = event.data;
      
      const capacity = await this.analyzeProductionCapacity(supplierId, orders);
      
      await eventBus.publish({
        eventType: 'ProductionCapacityChecked',
        data: { supplierId, orders, capacity },
        metadata: { sagaId: event.sagaId }
      });
    });

    subscribeLegacy('ProductionCapacityChecked', async (event) => {
      const { supplierId, orders, capacity } = event.data;
      
      const schedule = await this.createProductionSchedule(supplierId, orders, capacity);
      
      await eventBus.publish({
        eventType: 'ProductionScheduleCreated',
        data: { supplierId, schedule },
        metadata: { sagaId: event.sagaId }
      });
    });

    subscribeLegacy('ProductionScheduleCreated', async (event) => {
      const { supplierId, schedule } = event.data;
      
      const resources = await this.allocateProductionResources(supplierId, schedule);
      
      await eventBus.publish({
        eventType: 'ProductionResourcesAllocated',
        data: { supplierId, resources },
        metadata: { sagaId: event.sagaId }
      });
    });

    // Raw Material Procurement Events
    subscribeLegacy('MaterialRequirementsAnalyzed', async (event) => {
      const { supplierId, requirements } = event.data;
      
      const selectedSuppliers = await this.selectMaterialSuppliers(requirements);
      
      await eventBus.publish({
        eventType: 'MaterialSuppliersSelected',
        data: { supplierId, selectedSuppliers },
        metadata: { sagaId: event.sagaId }
      });
    });

    subscribeLegacy('MaterialSuppliersSelected', async (event) => {
      const { supplierId, selectedSuppliers } = event.data;
      
      const purchaseOrderId = `PO-${Date.now()}`;
      
      await eventBus.publish({
        eventType: 'MaterialPurchaseOrderCreated',
        data: { supplierId, purchaseOrderId },
        metadata: { sagaId: event.sagaId }
      });
    });

    subscribeLegacy('MaterialPurchaseOrderCreated', async (event) => {
      const { supplierId, purchaseOrderId } = event.data;
      
      await eventBus.publish({
        eventType: 'MaterialDeliveryTracked',
        data: { supplierId, purchaseOrderId, deliveryStatus: 'delivered' },
        metadata: { sagaId: event.sagaId }
      });
    });

    // Quality Control Events
    subscribeLegacy('QualityInspectionStarted', async (event) => {
      const { supplierId, batchId, products } = event.data;
      
      const testResults = await this.performQualityTesting(batchId, products);
      
      await eventBus.publish({
        eventType: 'QualityTestingCompleted',
        data: { supplierId, batchId, testResults },
        metadata: { sagaId: event.sagaId }
      });
    });

    subscribeLegacy('QualityTestingCompleted', async (event) => {
      const { supplierId, batchId, testResults } = event.data;
      
      const approved = testResults.passRate > 0.95;
      
      await eventBus.publish({
        eventType: 'QualityApprovalGranted',
        data: { supplierId, batchId, approved },
        metadata: { sagaId: event.sagaId }
      });
    });

    subscribeLegacy('QualityApprovalGranted', async (event) => {
      const { supplierId, batchId, approved } = event.data;
      
      if (approved) {
        const certificateId = `QC-${Date.now()}`;
        
        await eventBus.publish({
          eventType: 'QualityCertificateIssued',
          data: { supplierId, batchId, certificateId },
          metadata: { sagaId: event.sagaId }
        });
      }
    });
  }

  private async analyzeProductionCapacity(supplierId: string, orders: any) {
    return {
      totalCapacity: 1000,
      availableCapacity: 800,
      utilizationRate: 0.8
    };
  }

  private async createProductionSchedule(supplierId: string, orders: any, capacity: any) {
    return {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      phases: ['preparation', 'production', 'quality_check', 'packaging']
    };
  }

  private async allocateProductionResources(supplierId: string, schedule: any) {
    return {
      machinery: ['line1', 'line2'],
      workforce: 50,
      materials: ['raw_material_1', 'raw_material_2']
    };
  }

  private async selectMaterialSuppliers(requirements: any) {
    return [
      { id: 'supplier1', name: 'Material Corp', rating: 4.5 },
      { id: 'supplier2', name: 'Raw Materials Ltd', rating: 4.2 }
    ];
  }

  private async performQualityTesting(batchId: string, products: any) {
    return {
      passRate: 0.98,
      defectRate: 0.02,
      testDate: new Date(),
      inspector: 'QC-Inspector-1'
    };
  }

  async reserveInventory(reservationData: {
    orderId: string;
    items: Array<{
      productVariantId: string;
      quantity: number;
      warehouseId: string;
    }>;
  }): Promise<{ success: boolean; reservationIds: string[] }> {
    return await this.prisma.$transaction(async (tx) => {
      const reservationIds: string[] = [];
      const reservations: Array<{
        productVariantId: string;
        warehouseId: string;
        quantity: number;
        reservationId: string;
      }> = [];

      // Check availability and create reservations
      for (const item of reservationData.items) {
        const stock = await tx.inventory_StockItem.findFirst({
          where: {
            productVariantId: item.productVariantId,
            warehouseId: item.warehouseId
          }
        });

        if (!stock || stock.quantityAvailable < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productVariantId}`);
        }

        const reservationId = randomUUID();
        
        // Create reservation
        await tx.inventory_Reservation.create({
          data: {
            id: reservationId,
            orderId: reservationData.orderId,
            orderItemId: randomUUID(),
            productVariantId: item.productVariantId,
            warehouseId: item.warehouseId,
            quantityReserved: item.quantity,
            status: 'active',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
          }
        });

        // Update available quantity
        await tx.inventory_StockItem.update({
          where: { id: stock.id },
          data: {
            quantityAvailable: { decrement: item.quantity },
            quantityReserved: { increment: item.quantity }
          }
        });

        reservationIds.push(reservationId);
        reservations.push({
          productVariantId: item.productVariantId,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
          reservationId
        });
      }

      // Create inventory reserved event
      const eventPayload = EventFactory.createInventoryReserved({
        orderId: reservationData.orderId,
        reservations
      });

      const envelope: EventEnvelope<InventoryReservedPayload> = {
        eventId: randomUUID(),
        eventType: 'inventory.reserved.v1',
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        producer: 'inventory-service',
        version: 'v1',
        payload: eventPayload
      };

      await this.outbox.saveEvent(envelope, tx);

      return { success: true, reservationIds };
    });
  }

  async releaseInventory(orderId: string, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const reservations = await tx.inventory_Reservation.findMany({
        where: { orderId, status: 'active' }
      });

      const reservationIds: string[] = [];

      for (const reservation of reservations) {
        // Update reservation status
        await tx.inventory_Reservation.update({
          where: { id: reservation.id },
          data: { status: 'cancelled' }
        });

        // Restore inventory
        await tx.inventory_StockItem.updateMany({
          where: {
            productVariantId: reservation.productVariantId,
            warehouseId: reservation.warehouseId
          },
          data: {
            quantityAvailable: { increment: reservation.quantityReserved },
            quantityReserved: { decrement: reservation.quantityReserved }
          }
        });

        reservationIds.push(reservation.id);
      }

      // Create inventory released event
      const eventPayload: InventoryReleasedPayload = {
        version: 'v1',
        orderId,
        reservationIds,
        reason: reason as 'order_cancelled' | 'payment_failed' | 'expired'
      };

      const envelope: EventEnvelope<InventoryReleasedPayload> = {
        eventId: randomUUID(),
        eventType: 'inventory.released.v1',
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        producer: 'inventory-service',
        version: 'v1',
        payload: eventPayload
      };

      await this.outbox.saveEvent(envelope, tx);
    });
  }
}
