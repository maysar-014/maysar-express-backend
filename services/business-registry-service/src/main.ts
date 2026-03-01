import express from 'express';
import { createApiRouter } from './api';
import { config } from './config';
import { logger } from './infrastructure/services/logger.service';
import { tracingService, correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './infrastructure/monitoring/metrics';

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

app.listen(config.port, () => {
  logger.info(`Business Registry Service running on port ${config.port}`, {
    port: config.port,
    nodeEnv: config.nodeEnv
  });
});

export default app;
