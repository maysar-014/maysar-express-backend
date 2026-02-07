import { Router } from 'express';
import { healthRouter } from './health.routes';

export const apiRouter = Router();

// Register route modules
apiRouter.use('/health', healthRouter);

// Future API routes can be added here
// apiRouter.use('/routing', routingRouter);
// apiRouter.use('/tracking', trackingRouter);
