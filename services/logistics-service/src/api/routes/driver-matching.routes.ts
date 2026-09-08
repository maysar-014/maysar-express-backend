/**
 * Driver Matching routes (Phase 5 §5.1)
 *
 * POST /jobs/:jobId/match-drivers — internal, platform-only.
 * Returns the ranked candidate list; every candidate is persisted to
 * Logistics_DriverMatchAudit for post-hoc explanation of assignments.
 */

import { Router } from 'express';
import { MatchDriversUseCase } from '../../application/use-cases/match-drivers.use-case';
import { PrismaDeliveryJobRepository } from '../../infrastructure/repositories/prisma-delivery-job.repository';
import { PrismaShipmentRepository } from '../../infrastructure/repositories/prisma-shipment.repository';
import { PrismaVehicleTariffRepository } from '../../infrastructure/repositories/prisma-vehicle-tariff.repository';
import { PrismaDriverCandidateSource } from '../../infrastructure/providers/prisma-driver-candidate.source';
import { PrismaDriverMatchAuditRepository } from '../../infrastructure/repositories/prisma-phase5.repository';

const router = Router();

function buildUseCase(): MatchDriversUseCase {
  return new MatchDriversUseCase(
    new PrismaDeliveryJobRepository(),
    new PrismaShipmentRepository(),
    new PrismaVehicleTariffRepository(),
    new PrismaDriverCandidateSource(),
    new PrismaDriverMatchAuditRepository(),
  );
}

router.post('/jobs/:jobId/match-drivers', async (req, res) => {
  try {
    const result = await buildUseCase().execute(req.params.jobId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    const notFound = err?.message?.includes('not found');
    res.status(notFound ? 404 : 500).json({
      success: false,
      error: notFound ? 'DELIVERY_JOB_NOT_FOUND' : 'MATCHING_FAILED',
      message: err?.message,
    });
  }
});

export default router;
