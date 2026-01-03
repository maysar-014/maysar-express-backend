import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../shared/events/eventBus';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Initialize courier delivery handlers
initializeCourierDeliveryHandlers();

// Delivery management endpoints
app.post('/api/deliveries/assign', async (req, res) => {
  try {
    const delivery = await prisma.delivery.create({
      data: req.body
    });
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/deliveries/courier/:courierId', async (req, res) => {
  try {
    const deliveries = await prisma.delivery.findMany({
      where: { courierId: req.params.courierId }
    });
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function initializeCourierDeliveryHandlers() {
  // Delivery Assignment Saga Events
  eventBus.subscribe('DeliveryMatchingInitiated', async (event) => {
    const { courierId, location, availability } = event.data;
    
    const nearbyDeliveries = await findNearbyDeliveries(location);
    
    if (nearbyDeliveries.length > 0) {
      await eventBus.publish({
        type: 'DeliveryAssignmentOffered',
        data: { courierId, deliveryId: nearbyDeliveries[0].id, sagaId: event.sagaId }
      });
    }
  });

  eventBus.subscribe('DeliveryAssignmentOffered', async (event) => {
    const { courierId, deliveryId } = event.data;
    
    await eventBus.publish({
      type: 'DeliveryAssignmentAccepted',
      data: { courierId, deliveryId, accepted: true, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('DeliveryAssignmentAccepted', async (event) => {
    const { courierId, deliveryId, accepted } = event.data;
    
    if (accepted) {
      await eventBus.publish({
        type: 'RouteOptimizationRequested',
        data: { courierId, deliveryId, sagaId: event.sagaId }
      });
    }
  });

  // Route Optimization Saga Events
  eventBus.subscribe('RouteOptimizationRequested', async (event) => {
    const { courierId, deliveries, startLocation } = event.data;
    
    const trafficData = await analyzeTraffic(deliveries);
    
    await eventBus.publish({
      type: 'TrafficAnalysisCompleted',
      data: { courierId, deliveries, trafficData, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('TrafficAnalysisCompleted', async (event) => {
    const { courierId, deliveries, trafficData } = event.data;
    
    const optimizedRoute = calculateOptimalRoute(deliveries, trafficData);
    
    await eventBus.publish({
      type: 'OptimalRouteCalculated',
      data: { courierId, optimizedRoute, estimatedTime: 120, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('OptimalRouteCalculated', async (event) => {
    const { courierId, optimizedRoute } = event.data;
    
    await setupNavigation(courierId, optimizedRoute);
    
    await eventBus.publish({
      type: 'NavigationSetupCompleted',
      data: { courierId, optimizedRoute, sagaId: event.sagaId }
    });
  });

  // Delivery Completion Saga Events
  eventBus.subscribe('DeliveryAttemptStarted', async (event) => {
    const { courierId, deliveryId, location } = event.data;
    
    await eventBus.publish({
      type: 'DeliveryConfirmed',
      data: { courierId, deliveryId, status: 'delivered', proof: 'signature', sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('DeliveryConfirmed', async (event) => {
    const { courierId, deliveryId, status, proof } = event.data;
    
    await eventBus.publish({
      type: 'DeliveryCompletionNotificationSent',
      data: { courierId, deliveryId, customerId: 'customer-123', sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('DeliveryCompletionNotificationSent', async (event) => {
    const { courierId, deliveryId } = event.data;
    
    const baseRate = 50;
    
    await eventBus.publish({
      type: 'CourierEarningsUpdated',
      data: { courierId, deliveryId, earnings: baseRate, sagaId: event.sagaId }
    });
  });

  // Dashboard Events
  eventBus.subscribe('CourierDashboardDataRequested', async (event) => {
    const { courierId } = event.data;
    
    const activeDeliveries = await getActiveDeliveries(courierId);
    
    await eventBus.publish({
      type: 'ActiveDeliveriesUpdated',
      data: { courierId, activeDeliveries, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('ActiveDeliveriesUpdated', async (event) => {
    const { courierId } = event.data;
    
    await eventBus.publish({
      type: 'CourierDashboardRefreshed',
      data: { courierId, sagaId: event.sagaId }
    });
  });
}

// Helper functions
async function findNearbyDeliveries(location) {
  return [{ id: 'delivery-1', address: 'nearby location' }];
}

async function analyzeTraffic(deliveries) {
  return { congestionLevel: 'low', estimatedDelay: 5 };
}

function calculateOptimalRoute(deliveries, trafficData) {
  return deliveries;
}

async function setupNavigation(courierId, route) {
  console.log(`Navigation setup for courier ${courierId}`);
}

async function getActiveDeliveries(courierId) {
  return [{ id: 'delivery-1', status: 'assigned' }];
}

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`Logistics Service running on port ${PORT}`);
  console.log('Courier saga event handlers initialized');
});

export default app;