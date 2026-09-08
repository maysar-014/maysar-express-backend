/**
 * KPI routes (Phase 6 §6.2) — internal, platform-only.
 * GET /kpis — fairness and operational KPI snapshot for the ops dashboard.
 */

import { Router } from 'express';
import { LogisticsKpiService } from '../../application/services/logistics-kpi.service';

const router = Router();

router.get('/kpis', async (_req, res) => {
  try {
    const kpis = await new LogisticsKpiService().compute();
    res.json({ success: true, data: kpis });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'KPI_COMPUTATION_FAILED',
      message: err?.message,
    });
  }
});

export default router;
