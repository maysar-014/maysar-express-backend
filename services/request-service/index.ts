/**
 * Request Module — Maysar Request (sourcing & assisted-commerce).
 *
 * Mounted by app.ts at /api/request (module name 'request-service').
 * Exposes:
 *   - customer request lifecycle
 *   - provider/ops assessment + quote surface
 *   - secure public assessment-link resolve/convert (token-gated)
 */

import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { createRequestRoutes } from './src/api/routes/request.routes';
import { healthRoutes } from './src/api/routes/health.routes';
import { prisma } from './src/infrastructure/database/prisma-client';
import { RequestExpirationSweeper } from './src/application/services/request-expiration-sweeper';
import { appLogger } from '../../shared/logger/logger';

const __requestExpirationSweeper = new RequestExpirationSweeper();
(globalThis as any).__requestExpirationSweeper = __requestExpirationSweeper;

export const RequestModule: Module = {
  name: 'request-service',
  initialize: async () => {
    try {
      // Ensure the shared Prisma client is attached so repositories resolve it.
      (globalThis as any).prisma = prisma;
      // Phase 4 §4.1: start the expiration sweeper (quotes, links, supplier
      // availability, stale requests). Interval via REQUEST_SWEEPER_INTERVAL_MS.
      __requestExpirationSweeper.start();
      appLogger.info('[RequestModule] initialized');
    } catch (error) {
      appLogger.warn('[RequestModule] prisma initialization failed', { error: error instanceof Error ? error.message : String(error) });
    }
  },
  routes: (() => {
    const router = Router();
    router.use('/health', healthRoutes);
    // createRequestRoutes handles auth per-route: the public assessment-link
    // routes must stay reachable without a token.
    router.use('/', createRequestRoutes());
    return router;
  })(),
  shutdown: async () => {
    __requestExpirationSweeper.stop();
    appLogger.info('[RequestModule] shutting down');
  },
};