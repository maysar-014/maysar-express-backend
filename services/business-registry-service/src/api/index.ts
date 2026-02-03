import { Router } from 'express';
import { createBusinessRoutes } from './routes/business.routes';
import { createHealthRoutes } from './routes/health.routes';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware';
import { errorMiddleware } from './middleware/error.middleware';

export function createApiRouter(): Router {
  const router = Router();

  router.use(requestLoggerMiddleware);

  router.use('/health', createHealthRoutes());
  router.use('/api/businesses', createBusinessRoutes());

  router.use(errorMiddleware);

  return router;
}
