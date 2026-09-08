/**
 * Request Service — health routes.
 */

import { Router } from 'express';

export const healthRoutes = Router();

healthRoutes.get('/live', (_req, res) => {
  res.json({ status: 'alive', service: 'request-service' });
});

healthRoutes.get('/ready', (_req, res) => {
  res.json({ status: 'ready', service: 'request-service' });
});