import { Router } from 'express';
import { moduleRegistry } from '../core/module-registry';
import { degradationManager } from '../lib/degradation-manager';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
    const systemStatus = degradationManager.getSystemStatus();
    const allHealth = degradationManager.getAllServiceHealth();

    const health = {
        status: systemStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        modules: moduleRegistry.getModules().map(m => m.name),
        services: allHealth.map(h => ({
            name: h.name,
            status: h.status,
            responseTimeMs: h.responseTimeMs,
            lastCheck: h.lastCheck.toISOString(),
        })),
    };

    const statusCode = systemStatus === 'CRITICAL' ? 503 : 200;
    res.status(statusCode).json(health);
});

healthRouter.get('/liveness', (req, res) => {
    res.status(200).send('OK');
});

healthRouter.get('/readiness', async (req, res) => {
  const systemStatus = degradationManager.getSystemStatus();
  const criticalUnhealthy = degradationManager.getCriticalServicesUnhealthy();

  if (systemStatus === 'CRITICAL') {
    return res.status(503).json({
      status: 'not ready',
      reason: 'Critical services unhealthy',
      unhealthyServices: criticalUnhealthy.map(h => h.name),
    });
  }

  res.status(200).json({
    status: 'ready',
    systemStatus,
  });
});

healthRouter.get('/degradation', (req, res) => {
  const allHealth = degradationManager.getAllServiceHealth();
  const criticalUnhealthy = degradationManager.getCriticalServicesUnhealthy();
  const nonCriticalDegraded = degradationManager.getNonCriticalServicesDegraded();

  res.json({
    systemStatus: degradationManager.getSystemStatus(),
    services: allHealth.map(h => ({
      name: h.name,
      status: h.status,
      consecutiveFailures: h.consecutiveFailures,
      lastError: h.lastError,
      responseTimeMs: h.responseTimeMs,
      lastCheck: h.lastCheck.toISOString(),
    })),
    criticalUnhealthy: criticalUnhealthy.map(h => h.name),
    nonCriticalDegraded: nonCriticalDegraded.map(h => h.name),
  });
});
