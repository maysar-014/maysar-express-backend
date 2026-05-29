import { Router } from 'express';

import { GovernanceController } from '../controllers/governance.controller';

export function createGovernanceRoutes(controller: GovernanceController): Router {
  const router = Router();

  router.post('/runs', (req, res) => void controller.runAudit(req, res));
  router.get('/runs', (req, res) => controller.listRuns(req, res));
  router.get('/runs/:runId', (req, res) => controller.getRun(req, res));
  router.get('/runs/:runId/evidence/:gateId', (req, res) => controller.getEvidence(req, res));
  router.get('/reports/latest', (req, res) => controller.getLatestReport(req, res));
  router.get('/constitution', (req, res) => controller.getConstitution(req, res));
  router.get('/summary', (req, res) => controller.getSummary(req, res));
  router.get('/dashboard', (req, res) => controller.getDashboard(req, res));

  return router;
}
