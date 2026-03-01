import express from 'express';
import { createApiRouter } from './api';
import { config } from './config';
import { logger } from './infrastructure/services/logger.service';
import { tracingService, correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './infrastructure/monitoring/metrics';
import { eventBus } from '@shared/events/eventBus';
import type { DistributedSagaOrchestrator } from '@shared/saga/saga.orchestrator';

// Initialize Tracing
tracingService.start();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(correlationMiddleware());

// Prometheus metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

app.use(createApiRouter());

async function initializeSagaRecoveryWorker(): Promise<void> {
  try {
    const { BusinessRegistrationSaga } = await import('./application/sagas/business-registration.saga');
    const { BusinessOnboardingSaga } = await import('./application/sagas/business-onboarding.saga');
    const { BusinessVerificationSaga } = await import('./application/sagas/business-verification.saga');
    const { sagaLogRepository } = await import('./infrastructure/repositories/saga.repository');
    const { SagaRecoveryWorker } = await import('@shared/saga/saga-recovery.worker');
    const { mailerAdapter, complianceAdapter, capabilityAdapter, businessRepository } = await import('./infrastructure');

    const businessRegistrationSaga = new BusinessRegistrationSaga({
      mailer: mailerAdapter,
      compliance: complianceAdapter,
      businessRepository
    });
    
    const businessOnboardingSaga = new BusinessOnboardingSaga();
    
    const businessVerificationSaga = new BusinessVerificationSaga({
      mailer: mailerAdapter,
      capability: capabilityAdapter,
      businessRepository
    });
    
    const orchestratorRegistry = new Map<string, DistributedSagaOrchestrator<unknown>>();
    orchestratorRegistry.set('BusinessRegistrationSaga', businessRegistrationSaga as DistributedSagaOrchestrator<unknown>);
    orchestratorRegistry.set('BusinessOnboardingSaga', businessOnboardingSaga as DistributedSagaOrchestrator<unknown>);
    orchestratorRegistry.set('BusinessVerificationSaga', businessVerificationSaga as DistributedSagaOrchestrator<unknown>);

    const sagaRecoveryWorker = new SagaRecoveryWorker(sagaLogRepository, orchestratorRegistry, {
      stuckThresholdMs: 5 * 60 * 1000,
      pollIntervalMs: 60 * 1000
    });
    sagaRecoveryWorker.start();

    logger.info('✅ Saga Recovery Worker initialized with 3 registered saga types');
  } catch (error) {
    logger.warn('⚠️ Failed to initialize Saga Recovery Worker', { error });
  }
}

app.listen(config.port, async () => {
  logger.info(`Business Registry Service running on port ${config.port}`, {
    port: config.port,
    nodeEnv: config.nodeEnv
  });
  await initializeSagaRecoveryWorker();
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await eventBus.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await eventBus.shutdown();
  process.exit(0);
});

export default app;
