import { Router } from 'express';

export const healthRoutes = Router();

healthRoutes.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'kyc-service',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

healthRoutes.get('/ready', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'kyc-service',
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});
