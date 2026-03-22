import { Router } from 'express';
import { createBusinessRoutes } from './routes/business.routes';
import { createHealthRoutes } from './routes/health.routes';
import { createMaintenanceRoutes } from './routes/maintenance.routes';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { requireRoleOrService } from '@shared/middleware/auth-context.middleware';

export function createApiRouter(): Router {
  const router = Router();

  router.use(requestLoggerMiddleware);

  router.use('/health', createHealthRoutes());
  router.use('/api/businesses', createBusinessRoutes());
  router.use('/api/v1/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());

  router.use(errorMiddleware);

  return router;
}


