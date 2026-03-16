/**
 * Commission Routes
 * API routes for commission operations
 */

import { Router } from 'express';
import { CommissionController } from '../controllers/commission.controller';
import { CalculateCommissionUseCase } from '../../application/use-cases/calculate-commission.use-case';
import { ApproveCommissionUseCase } from '../../application/use-cases/approve-commission.use-case';
import { ICommissionRepository, IEventStoreRepository, IPayoutRepository } from '../../domain/repositories/index';
import {
  validateCalculateCommission,
  validateApproveCommission,
  validateCommissionQuery,
  validateSellerId,
  validateCommissionId
} from '../middleware/validation.middleware';
import { PrismaCommissionRepository } from '../../infrastructure/repositories/prisma-commission.repository';
import { PrismaEventStoreRepository } from '../../infrastructure/repositories/prisma-event-store.repository';

const router = Router();

// TODO: Wire payout repository once available (CommissionPayout persistence).
const commissionRepository: ICommissionRepository = new PrismaCommissionRepository();
const payoutRepository: IPayoutRepository = {} as IPayoutRepository;
const eventStore: IEventStoreRepository = new PrismaEventStoreRepository();

const calculateCommissionUseCase = new CalculateCommissionUseCase(
  commissionRepository,
  eventStore
);

const approveCommissionUseCase = new ApproveCommissionUseCase(
  commissionRepository,
  payoutRepository,
  eventStore
);

const commissionController = new CommissionController(
  calculateCommissionUseCase,
  approveCommissionUseCase,
  commissionRepository
);

/**
 * POST /api/commissions/calculate
 * Calculate commission for an order
 */
router.post('/calculate', validateCalculateCommission, async (req, res) => {
  await commissionController.calculateCommission(req, res);
});

/**
 * PUT /api/commissions/:id/approve
 * Approve a commission
 */
router.put('/:id/approve', validateApproveCommission, async (req, res) => {
  await commissionController.approveCommission(req, res);
});

/**
 * GET /api/commissions/:id
 * Get commission by ID
 */
router.get('/:id', validateCommissionId, async (req, res) => {
  await commissionController.getCommission(req, res);
});

/**
 * GET /api/commissions/sellers/:sellerId
 * Get commissions for a seller
 */
router.get('/sellers/:sellerId', validateSellerId, validateCommissionQuery, async (req, res) => {
  await commissionController.getSellerCommissions(req, res);
});

/**
 * GET /api/commissions/sellers/:sellerId/summary
 * Get commission summary for a seller
 */
router.get('/sellers/:sellerId/summary', validateSellerId, async (req, res) => {
  await commissionController.getCommissionSummary(req, res);
});

export default router;
