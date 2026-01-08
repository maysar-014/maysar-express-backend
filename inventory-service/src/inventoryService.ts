import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from '../../../shared/outbox/outboxPattern';
import { EventEnvelope, InventoryReservedPayload, InventoryReleasedPayload, EventFactory } from '../../../events';
import { eventBus } from '../../../shared/events/eventBus';
import { randomUUID } from 'crypto';

export class InventoryService {
  private outbox: TransactionalOutbox;

  constructor(private prisma: PrismaClient) {
    this.outbox = new TransactionalOutbox(prisma);
    this.initializeEventHandlers();
    this.initializeSupplierEventHandlers();
    this.initializeSellerSagaHandlers();
  }

  private initializeSellerSagaHandlers() {
    // Inventory Management Saga Events
    eventBus.subscribe('StockChecked', async (event) => {
      const { productId, stockLevel, reorderPoint } = event.data;
      
      if (stockLevel <= reorderPoint) {
        await eventBus.publish({
          type: 'ReorderCalculated',
          data: { productId, reorderQuantity: 200, estimatedCost: 5000, sagaId: event.sagaId }
        });
      }
    });

    eventBus.subscribe('ReorderCalculated', async (event) => {
      const { productId, reorderQuantity } = event.data;
      
      await eventBus.publish({
        type: 'SupplierNotified',
        data: { productId, reorderQuantity, notifiedAt: new Date(), sagaId: event.sagaId }
      });
    });

    eventBus.subscribe('SupplierNotified', async (event) => {
      const { productId } = event.data;
      
      await eventBus.publish({
        type: 'InventoryUpdated',
        data: { productId, updatedAt: new Date(), sagaId: event.sagaId }
      });
    });

    // Order Processing Saga Events
    eventBus.subscribe('OrderReceived', async (event) => {
      const { orderId, items } = event.data;
      
      for (const item of items) {
        await eventBus.publish({
          type: 'InventoryReserved',
          data: { orderId, productId: item.productId, quantity: item.quantity, sagaId: event.sagaId }
        });
      }
    });

    eventBus.subscribe('PaymentFailed', async (event) => {
      const { orderId, items } = event.data;
      
      for (const item of items) {
        await eventBus.publish({
          type: 'InventoryReleased',
          data: { orderId, productId: item.productId, quantity: item.quantity, sagaId: event.sagaId }
        });
      }
    });

    // Bulk Product Operations Saga Events
    eventBus.subscribe('BulkOperationValidated', async (event) => {
      const { productIds, operation } = event.data;
      
      for (const productId of productIds) {
        await eventBus.publish({
          type: 'BulkProductOperationExecuted',
          data: { productId, operation, sagaId: event.sagaId }
        });
      }
    });

    eventBus.subscribe('BulkProductOperationExecuted', async (event) => {
      const { productIds } = event.data;
      
      await eventBus.publish({
        type: 'BulkOperationCompleted',
        data: { productCount: productIds?.length || 1, sagaId: event.sagaId }
      });
    });
  }

  private initializeSupplierEventHandlers() {
    // Production Planning Events
    eventBus.subscribe('ProductionOrdersAnalyzed', async (event) => {
      const { supplierId, orders } = event.data;
      
      const capacity = await this.analyzeProductionCapacity(supplierId, orders);
      
      await eventBus.publish({
        type: 'ProductionCapacityChecked',
        data: { supplierId, orders, capacity, sagaId: event.sagaId }
      });
    });

    eventBus.subscribe('ProductionCapacityChecked', async (event) => {
      const { supplierId, orders, capacity } = event.data;
      
      const schedule = await this.createProductionSchedule(supplierId, orders, capacity);
      
      await eventBus.publish({
        type: 'ProductionScheduleCreated',
        data: { supplierId, schedule, sagaId: event.sagaId }
      });
    });

    eventBus.subscribe('ProductionScheduleCreated', async (event) => {
      const { supplierId, schedule } = event.data;
      
      const resources = await this.allocateProductionResources(supplierId, schedule);
      
      await eventBus.publish({
        type: 'ProductionResourcesAllocated',
        data: { supplierId, resources, sagaId: event.sagaId }
      });
    });

    // Raw Material Procurement Events
    eventBus.subscribe('MaterialRequirementsAnalyzed', async (event) => {
      const { supplierId, requirements } = event.data;
      
      const selectedSuppliers = await this.selectMaterialSuppliers(requirements);
      
      await eventBus.publish({
        type: 'MaterialSuppliersSelected',
        data: { supplierId, selectedSuppliers, sagaId: event.sagaId }
      });
    });

    eventBus.subscribe('MaterialSuppliersSelected', async (event) => {
      const { supplierId, selectedSuppliers } = event.data;
      
      const purchaseOrderId = `PO-${Date.now()}`;
      
      await eventBus.publish({
        type: 'MaterialPurchaseOrderCreated',
        data: { supplierId, purchaseOrderId, sagaId: event.sagaId }
      });
    });

    eventBus.subscribe('MaterialPurchaseOrderCreated', async (event) => {
      const { supplierId, purchaseOrderId } = event.data;
      
      await eventBus.publish({
        type: 'MaterialDeliveryTracked',
        data: { supplierId, purchaseOrderId, deliveryStatus: 'delivered', sagaId: event.sagaId }
      });
    });

    // Quality Control Events
    eventBus.subscribe('QualityInspectionStarted', async (event) => {
      const { supplierId, batchId, products } = event.data;
      
      const testResults = await this.performQualityTesting(batchId, products);
      
      await eventBus.publish({
        type: 'QualityTestingCompleted',
        data: { supplierId, batchId, testResults, sagaId: event.sagaId }
      });
    });

    eventBus.subscribe('QualityTestingCompleted', async (event) => {
      const { supplierId, batchId, testResults } = event.data;
      
      const approved = testResults.passRate > 0.95;
      
      await eventBus.publish({
        type: 'QualityApprovalGranted',
        data: { supplierId, batchId, approved, sagaId: event.sagaId }
      });
    });

    eventBus.subscribe('QualityApprovalGranted', async (event) => {
      const { supplierId, batchId, approved } = event.data;
      
      if (approved) {
        const certificateId = `QC-${Date.now()}`;
        
        await eventBus.publish({
          type: 'QualityCertificateIssued',
          data: { supplierId, batchId, certificateId, sagaId: event.sagaId }
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
        const stock = await tx.inventory.findFirst({
          where: {
            productVariantId: item.productVariantId,
            warehouseId: item.warehouseId
          }
        });

        if (!stock || stock.availableQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productVariantId}`);
        }

        const reservationId = randomUUID();
        
        // Create reservation
        await tx.inventoryReservation.create({
          data: {
            id: reservationId,
            orderId: reservationData.orderId,
            productVariantId: item.productVariantId,
            warehouseId: item.warehouseId,
            quantity: item.quantity,
            status: 'active',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
          }
        });

        // Update available quantity
        await tx.inventory.update({
          where: { id: stock.id },
          data: {
            availableQuantity: { decrement: item.quantity },
            reservedQuantity: { increment: item.quantity }
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
      const reservations = await tx.inventoryReservation.findMany({
        where: { orderId, status: 'active' }
      });

      const reservationIds: string[] = [];

      for (const reservation of reservations) {
        // Update reservation status
        await tx.inventoryReservation.update({
          where: { id: reservation.id },
          data: { status: 'released' }
        });

        // Restore inventory
        await tx.inventory.updateMany({
          where: {
            productVariantId: reservation.productVariantId,
            warehouseId: reservation.warehouseId
          },
          data: {
            availableQuantity: { increment: reservation.quantity },
            reservedQuantity: { decrement: reservation.quantity }
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