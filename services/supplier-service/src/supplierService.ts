import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../../shared/events/eventBus';
import { TransactionalOutbox } from '../../../shared/outbox/outboxPattern';
import { randomUUID } from 'crypto';

const app = express();
const prisma = new PrismaClient();
const outbox = new TransactionalOutbox(prisma);

app.use(express.json());

// Initialize event handlers for supplier sagas
initializeSupplierEventHandlers();

// Production Management API
app.post('/api/production/plans', async (req, res) => {
  try {
    const plan = await prisma.productionPlan.create({
      data: req.body,
      include: { orders: true, resources: true }
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/production/capacity/:supplierId', async (req, res) => {
  try {
    const capacity = await prisma.productionCapacity.findMany({
      where: { supplierId: req.params.supplierId },
      include: { resources: true }
    });
    res.json(capacity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quality Control API
app.post('/api/quality/inspections', async (req, res) => {
  try {
    const inspection = await prisma.qualityInspection.create({
      data: req.body,
      include: { testResults: true }
    });
    res.json(inspection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Order Management API
app.post('/api/bulk-orders', async (req, res) => {
  try {
    const bulkOrder = await prisma.bulkOrder.create({
      data: req.body,
      include: { items: true, shipments: true }
    });
    res.json(bulkOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Wholesale Pricing API
app.post('/api/wholesale/pricing', async (req, res) => {
  try {
    const pricing = await prisma.wholesalePricing.create({
      data: req.body,
      include: { tiers: true }
    });
    res.json(pricing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function initializeSupplierEventHandlers() {
  // Production Planning Saga Events
  eventBus.subscribe('ProductionOrdersAnalyzed', async (event) => {
    const { supplierId, orders, analysis } = event.data;
    
    await prisma.productionAnalysis.create({
      data: {
        supplierId,
        orders: JSON.stringify(orders),
        analysis: JSON.stringify(analysis),
        status: 'completed'
      }
    });
    
    await eventBus.publish({
      type: 'ProductionCapacityChecked',
      data: { supplierId, orders, capacity: {}, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('ProductionCapacityChecked', async (event) => {
    const { supplierId, orders, capacity } = event.data;
    
    const availableCapacity = await prisma.productionCapacity.findFirst({
      where: { supplierId, status: 'active' }
    });
    
    if (availableCapacity) {
      await eventBus.publish({
        type: 'ProductionScheduleCreated',
        data: { supplierId, schedule: {}, sagaId: event.sagaId }
      });
    } else {
      throw new Error('Insufficient production capacity');
    }
  });

  eventBus.subscribe('ProductionScheduleCreated', async (event) => {
    const { supplierId, schedule } = event.data;
    
    const productionSchedule = await prisma.productionSchedule.create({
      data: {
        supplierId,
        schedule: JSON.stringify(schedule),
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    });
    
    await eventBus.publish({
      type: 'ProductionResourcesAllocated',
      data: { supplierId, scheduleId: productionSchedule.id, resources: {}, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('ProductionResourcesAllocated', async (event) => {
    const { supplierId, scheduleId, resources } = event.data;
    
    await prisma.resourceAllocation.create({
      data: {
        supplierId,
        scheduleId,
        resources: JSON.stringify(resources),
        status: 'allocated'
      }
    });
  });

  // Quality Control Saga Events
  eventBus.subscribe('QualityInspectionStarted', async (event) => {
    const { supplierId, batchId, products } = event.data;
    
    const inspection = await prisma.qualityInspection.create({
      data: {
        supplierId,
        batchId,
        products: JSON.stringify(products),
        status: 'in_progress',
        startedAt: new Date()
      }
    });
    
    await eventBus.publish({
      type: 'QualityTestingCompleted',
      data: { supplierId, batchId, inspectionId: inspection.id, testResults: {}, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('QualityTestingCompleted', async (event) => {
    const { supplierId, batchId, inspectionId, testResults } = event.data;
    
    await prisma.qualityInspection.update({
      where: { id: inspectionId },
      data: {
        testResults: JSON.stringify(testResults),
        status: 'tested',
        testedAt: new Date()
      }
    });
    
    const passed = testResults.overallScore >= 85; // Quality threshold
    
    if (passed) {
      await eventBus.publish({
        type: 'QualityApprovalGranted',
        data: { supplierId, batchId, approved: true, sagaId: event.sagaId }
      });
    } else {
      throw new Error('Quality standards not met');
    }
  });

  eventBus.subscribe('QualityApprovalGranted', async (event) => {
    const { supplierId, batchId } = event.data;
    
    await prisma.qualityApproval.create({
      data: {
        supplierId,
        batchId,
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: 'system'
      }
    });
    
    await eventBus.publish({
      type: 'QualityCertificateIssued',
      data: { supplierId, batchId, certificateId: `QC-${Date.now()}`, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('QualityCertificateIssued', async (event) => {
    const { supplierId, batchId, certificateId } = event.data;
    
    await prisma.qualityCertificate.create({
      data: {
        id: certificateId,
        supplierId,
        batchId,
        status: 'issued',
        issuedAt: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      }
    });
  });

  // Raw Material Procurement Saga Events
  eventBus.subscribe('MaterialRequirementsAnalyzed', async (event) => {
    const { supplierId, requirements } = event.data;
    
    await prisma.materialRequirement.create({
      data: {
        supplierId,
        requirements: JSON.stringify(requirements),
        status: 'analyzed'
      }
    });
    
    await eventBus.publish({
      type: 'MaterialSuppliersSelected',
      data: { supplierId, selectedSuppliers: [], sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('MaterialSuppliersSelected', async (event) => {
    const { supplierId, selectedSuppliers } = event.data;
    
    await eventBus.publish({
      type: 'MaterialPurchaseOrderCreated',
      data: { supplierId, purchaseOrderId: `PO-${Date.now()}`, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('MaterialPurchaseOrderCreated', async (event) => {
    const { supplierId, purchaseOrderId } = event.data;
    
    await prisma.purchaseOrder.create({
      data: {
        id: purchaseOrderId,
        supplierId,
        status: 'created',
        orderDate: new Date()
      }
    });
    
    await eventBus.publish({
      type: 'MaterialDeliveryTracked',
      data: { supplierId, purchaseOrderId, deliveryStatus: 'pending', sagaId: event.sagaId }
    });
  });

  // Bulk Order Fulfillment Saga Events
  eventBus.subscribe('BulkOrderReceived', async (event) => {
    const { supplierId, bulkOrderId, orderDetails } = event.data;
    
    await prisma.bulkOrder.create({
      data: {
        id: bulkOrderId,
        supplierId,
        orderDetails: JSON.stringify(orderDetails),
        status: 'received',
        receivedAt: new Date()
      }
    });
    
    await eventBus.publish({
      type: 'BulkOrderCapacityValidated',
      data: { supplierId, bulkOrderId, capacityAvailable: true, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('BulkOrderCapacityValidated', async (event) => {
    const { supplierId, bulkOrderId, capacityAvailable } = event.data;
    
    if (capacityAvailable) {
      await eventBus.publish({
        type: 'BulkOrderProductionScheduled',
        data: { supplierId, bulkOrderId, productionStartDate: new Date(), sagaId: event.sagaId }
      });
    } else {
      throw new Error('Insufficient capacity for bulk order');
    }
  });

  eventBus.subscribe('BulkOrderProductionScheduled', async (event) => {
    const { supplierId, bulkOrderId, productionStartDate } = event.data;
    
    await prisma.bulkOrder.update({
      where: { id: bulkOrderId },
      data: {
        status: 'scheduled',
        productionStartDate
      }
    });
    
    await eventBus.publish({
      type: 'BulkOrderManufacturingStarted',
      data: { supplierId, bulkOrderId, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('BulkOrderManufacturingStarted', async (event) => {
    const { supplierId, bulkOrderId } = event.data;
    
    await prisma.bulkOrder.update({
      where: { id: bulkOrderId },
      data: {
        status: 'manufacturing',
        manufacturingStartedAt: new Date()
      }
    });
    
    await eventBus.publish({
      type: 'BulkOrderQualityChecked',
      data: { supplierId, bulkOrderId, qualityPassed: true, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('BulkOrderQualityChecked', async (event) => {
    const { supplierId, bulkOrderId, qualityPassed } = event.data;
    
    if (qualityPassed) {
      await prisma.bulkOrder.update({
        where: { id: bulkOrderId },
        data: {
          status: 'quality_approved',
          qualityCheckedAt: new Date()
        }
      });
      
      await eventBus.publish({
        type: 'BulkOrderShipped',
        data: { supplierId, bulkOrderId, trackingNumber: `BULK-${Date.now()}`, sagaId: event.sagaId }
      });
    } else {
      throw new Error('Bulk order failed quality check');
    }
  });

  eventBus.subscribe('BulkOrderShipped', async (event) => {
    const { supplierId, bulkOrderId, trackingNumber } = event.data;
    
    await prisma.bulkOrder.update({
      where: { id: bulkOrderId },
      data: {
        status: 'shipped',
        trackingNumber,
        shippedAt: new Date()
      }
    });
  });

  // Bulk Shipping Coordination Saga Events
  eventBus.subscribe('BulkShippingPlanned', async (event) => {
    const { supplierId, bulkOrderId, shippingPlan } = event.data;
    
    await prisma.shippingPlan.create({
      data: {
        supplierId,
        bulkOrderId,
        plan: JSON.stringify(shippingPlan),
        status: 'planned'
      }
    });
    
    await eventBus.publish({
      type: 'BulkShippingCarrierCoordinated',
      data: { supplierId, bulkOrderId, carrier: 'FreightCorp', sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('BulkShippingCarrierCoordinated', async (event) => {
    const { supplierId, bulkOrderId, carrier } = event.data;
    
    await prisma.carrierCoordination.create({
      data: {
        supplierId,
        bulkOrderId,
        carrier,
        status: 'coordinated',
        coordinatedAt: new Date()
      }
    });
    
    await eventBus.publish({
      type: 'BulkShippingLoadingCompleted',
      data: { supplierId, bulkOrderId, loadingTime: new Date(), sagaId: event.sagaId }
    });
  });

  // Wholesale Pricing Saga Events
  eventBus.subscribe('WholesaleCostAnalyzed', async (event) => {
    const { supplierId, products, costAnalysis } = event.data;
    
    await prisma.costAnalysis.create({
      data: {
        supplierId,
        products: JSON.stringify(products),
        analysis: JSON.stringify(costAnalysis),
        status: 'completed'
      }
    });
    
    await eventBus.publish({
      type: 'WholesalePricingCalculated',
      data: { supplierId, products, pricing: {}, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('WholesalePricingCalculated', async (event) => {
    const { supplierId, products, pricing } = event.data;
    
    await prisma.pricingCalculation.create({
      data: {
        supplierId,
        products: JSON.stringify(products),
        pricing: JSON.stringify(pricing),
        status: 'calculated'
      }
    });
    
    await eventBus.publish({
      type: 'WholesalePricingApproved',
      data: { supplierId, products, approvedPricing: pricing, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('WholesalePricingApproved', async (event) => {
    const { supplierId, products, approvedPricing } = event.data;
    
    await prisma.wholesalePricing.create({
      data: {
        supplierId,
        products: JSON.stringify(products),
        pricing: JSON.stringify(approvedPricing),
        status: 'approved',
        approvedAt: new Date()
      }
    });
    
    await eventBus.publish({
      type: 'WholesalePricingPublished',
      data: { supplierId, products, publishedAt: new Date(), sagaId: event.sagaId }
    });
  });

  // Supplier Payment Processing Saga Events
  eventBus.subscribe('SupplierPaymentRequested', async (event) => {
    const { supplierId, bulkOrderId, amount } = event.data;
    
    await prisma.supplierPayment.create({
      data: {
        supplierId,
        bulkOrderId,
        amount,
        status: 'requested',
        requestedAt: new Date()
      }
    });
    
    await eventBus.publish({
      type: 'SupplierPaymentValidated',
      data: { supplierId, bulkOrderId, amount, validationPassed: true, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SupplierPaymentValidated', async (event) => {
    const { supplierId, bulkOrderId, amount, validationPassed } = event.data;
    
    if (validationPassed) {
      await eventBus.publish({
        type: 'SupplierPaymentProcessed',
        data: { supplierId, bulkOrderId, amount, transactionId: `TXN-${Date.now()}`, sagaId: event.sagaId }
      });
    } else {
      throw new Error('Payment validation failed');
    }
  });

  eventBus.subscribe('SupplierPaymentProcessed', async (event) => {
    const { supplierId, bulkOrderId, amount, transactionId } = event.data;
    
    await prisma.supplierPayment.updateMany({
      where: { supplierId, bulkOrderId },
      data: {
        status: 'processed',
        transactionId,
        processedAt: new Date()
      }
    });
    
    await eventBus.publish({
      type: 'SupplierPaymentConfirmed',
      data: { supplierId, bulkOrderId, transactionId, confirmedAt: new Date(), sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SupplierPaymentConfirmed', async (event) => {
    const { supplierId, bulkOrderId, transactionId } = event.data;
    
    await prisma.supplierPayment.updateMany({
      where: { supplierId, bulkOrderId, transactionId },
      data: {
        status: 'confirmed',
        confirmedAt: new Date()
      }
    });
    
    await eventBus.publish({
      type: 'SupplierPaymentNotificationSent',
      data: { supplierId, bulkOrderId, transactionId, sagaId: event.sagaId }
    });
  });
}

const PORT = process.env.PORT || 3014;
app.listen(PORT, () => {
  console.log(`Supplier Service running on port ${PORT}`);
  console.log('Supplier saga event handlers initialized');
});

export default app;