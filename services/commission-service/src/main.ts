/**
 * Commission Service Main Application
 * Application bootstrap and dependency injection
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaCommissionRepository } from './infrastructure/repositories/prisma-commission.repository';
import { CalculateCommissionUseCase } from './application/use-cases/calculate-commission.use-case';
import { ApproveCommissionUseCase } from './application/use-cases/approve-commission.use-case';
import { CommissionController } from './api/controllers/commission.controller';
import { validateCalculateCommission, validateApproveCommission } from './api/middleware/validation.middleware';
import { errorHandler, notFoundHandler } from './api/middleware/error.middleware';

// Import routes
import commissionRoutes from './api/routes/commission.routes';
import healthRoutes from './api/routes/health.routes';

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check routes (no auth required)
app.use('/health', healthRoutes);

// API routes
app.use('/api/commissions', commissionRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3008;
const server = app.listen(PORT, () => {
  console.log(`🚀 Commission Service running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API docs: http://localhost:${PORT}/api/commissions`);
});

// Export for testing
export default app;
