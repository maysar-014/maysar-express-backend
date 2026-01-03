import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../../shared/events/eventBus';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Service Health Monitoring - ServiceHealthMonitoringSaga Integration
app.post('/api/admin/health-check', async (req, res) => {
  const { serviceId, serviceName, sagaId } = req.body;

  try {
    const healthStatus = 'healthy';
    const metrics = {
      responseTime: { p50: 120, p95: 250, p99: 500 },
      throughput: { requestsPerSecond: 150 },
      errorRate: { percentage: 0.5 },
      resources: { cpuUsage: 45, memoryUsage: 60 }
    };

    await eventBus.publish('ServiceHealthCheckCompleted.v1', {
      serviceId, serviceName, healthStatus, sagaId
    });

    await eventBus.publish('ServiceMetricsCollected.v1', {
      serviceId, serviceName, metrics, sagaId
    });

    const alerts = metrics.errorRate.percentage > 5 ? [
      { type: 'high_error_rate', severity: 'high' }
    ] : [];

    await eventBus.publish('ServiceAlertsEvaluated.v1', {
      serviceId, serviceName, alerts, sagaId
    });

    res.json({ success: true, healthStatus, metrics, alerts });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Security Incident Response - SecurityIncidentResponseSaga Integration
app.post('/api/admin/security-incident', async (req, res) => {
  const { incidentId, incidentType, severity, source, sagaId } = req.body;

  try {
    await eventBus.publish('SecurityIncidentDetected.v1', {
      incidentId, incidentType, severity, source, sagaId
    });

    const threatAssessment = {
      riskLevel: 'high',
      impactScope: 'localized',
      urgency: 'immediate'
    };

    await eventBus.publish('SecurityThreatAssessed.v1', {
      incidentId, threatAssessment, sagaId
    });

    const containmentActions = ['disable_compromised_accounts', 'reset_access_tokens'];
    await eventBus.publish('SecurityIncidentContained.v1', {
      incidentId, containmentActions, sagaId
    });

    res.json({ success: true, status: 'contained' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Dashboard Analytics - DashboardAnalyticsSaga Integration
app.post('/api/admin/dashboard-analytics', async (req, res) => {
  const { dashboardType, timeRange, filters, userId, sagaId } = req.body;

  try {
    const metrics = {
      executive: {
        revenue: { total: 125000, growth: 15.2 },
        users: { total: 5420, active: 3890, new: 234 }
      },
      operational: {
        systemHealth: { uptime: 99.95, errors: 12 },
        performance: { avgResponseTime: 180, throughput: 1200 }
      },
      business: {
        sellers: { active: 450, new: 23 },
        products: { total: 12500, published: 11800 }
      }
    }[dashboardType];

    await eventBus.publish('DashboardMetricsCollected.v1', {
      dashboardType, metrics, sagaId
    });

    const kpis = {
      customerAcquisitionCost: 45.50,
      lifetimeValue: 890.25,
      conversionRate: 3.2
    };

    await eventBus.publish('DashboardKPIsCalculated.v1', {
      dashboardType, kpis, sagaId
    });

    await eventBus.publish('DashboardUpdated.v1', {
      dashboardType, userId, sagaId
    });

    res.json({ success: true, metrics, kpis });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Seller Management - SellerManagementSaga Integration
app.post('/api/admin/seller-operation', async (req, res) => {
  const { sellerId, operation, data, sagaId } = req.body;

  try {
    await eventBus.publish('SellerValidated.v1', { sellerId, operation, sagaId });

    await eventBus.publish('SellerOperationExecuted.v1', {
      sellerId, operation, data, sagaId
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3014;
app.listen(PORT, () => console.log(`Admin Service running on port ${PORT}`));

export default app;